// Solicita autorizacao ao navegador e usa apenas coordenadas aproximadas.
export async function getIssueLocation(): Promise<string> {
  if (!navigator.geolocation) return 'Localização não disponibilizada';
  const position = await new Promise<GeolocationPosition | null>(resolve => {
    const timer = window.setTimeout(() => resolve(null), 5500);
    navigator.geolocation.getCurrentPosition(p => { clearTimeout(timer); resolve(p); },
      () => { clearTimeout(timer); resolve(null); }, { timeout: 5000, maximumAge: 60000 });
  });
  if (!position) return 'Localização não disponibilizada';
  const lat = position.coords.latitude.toFixed(2);
  const lon = position.coords.longitude.toFixed(2);
  // O serviço de geocodificação recebe somente a posição arredondada, como no fluxo anterior.
  try {
    const response = await fetch('https://nominatim.openstreetmap.org/reverse?' +
      new URLSearchParams({ format: 'json', lat, lon, zoom: '10', addressdetails: '1' }),
      { signal: AbortSignal.timeout(2500) });
    if (response.ok) {
      const a = (await response.json()).address || {};
      const city = a.city || a.town || a.village || a.municipality;
      if (city) return [city, a.state].filter(Boolean).join(' - ');
    }
  } catch { /* fallback para localizacao aproximada */ }
  return lat + ', ' + lon + ' (aproximada)';
}
