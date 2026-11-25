<?php
require_once __DIR__ . '/../public/api/report_data.php';
function check($condition, $message) { if (!$condition) throw new RuntimeException($message); }
$a = ['contract'=>'5900.0134711.26.7','period'=>'2026 - OUTUBRO','dates'=>['2026-10-20'],
    'user'=>['id'=>10,'preposto_id'=>20,'preposto'=>'Gestor'],
    'tickets'=>[['id'=>1,'titulo'=>'Atividade','descricao'=>"Linha 1\nLinha 2",'status'=>'Atribuído']],
    'code'=>'A','issued_at'=>'2026-11-25T13:00:00Z','currentUser'=>['id'=>30],'ip'=>'1','browser'=>'A','location'=>'A'];
$h = rda_content_hash($a);
$b = $a; $b['code']='B'; $b['issued_at']='2026-11-26T13:00:00Z'; $b['currentUser']=['id'=>31]; $b['ip']='2'; $b['browser']='B'; $b['location']='B';
check($h === rda_content_hash($b), 'Metadados de emissao nao devem alterar hash de conteudo');
$b = $a; $b['tickets'][0]['descricao']='Alterada'; check($h !== rda_content_hash($b), 'Descricao');
$b = $a; $b['tickets'][0]['status']='Fechado'; check($h !== rda_content_hash($b), 'Status');
$b = $a; $b['tickets'][]=['id'=>2]; check($h !== rda_content_hash($b), 'Inclusao');
$b = $a; $b['tickets']=[]; check($h !== rda_content_hash($b), 'Exclusao');
$b = $a; $b['user']['preposto_id']=21; check($h !== rda_content_hash($b), 'Preposto');
$b = $a; $b['dates'][]='2026-10-21'; check($h !== rda_content_hash($b), 'Calendario');
$b = array_reverse($a, true); $b['user']=array_reverse($a['user'], true); check($h === rda_content_hash($b), 'Ordem de campos');
echo "8 verificacoes de hash OK\n";
