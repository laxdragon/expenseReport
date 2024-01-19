<?php

/*
 *  Expense Report
 *  creates XLS spreadsheet, add attaches files
 *  by Jeremy Newman <laxdragon@gmail.com>
 */

$file_root = realpath(dirname(__FILE__));
$config_path = "{$file_root}/config.yaml";

if (!file_exists($config_path))
    trigger_error("Config file does not exist!", E_USER_ERROR);
if (!function_exists('yaml_parse_file'))
    trigger_error("YAML library not installed!", E_USER_ERROR);
$config = yaml_parse_file($config_path);

if (empty($_POST) or empty($_POST['email'])) {
    echo "Form data incomplete!";
    exit();
}

require 'include/vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

$out = "";

try {

    foreach (array('fname','lname','email','notes') as $p)
    {
        $_POST[$p] = trim($_POST[$p]);
    }

    $styleBold = ['font' => ['bold' => true]];

    $spreadsheet = new Spreadsheet();
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->getColumnDimension('B')->setWidth(180,'pt');
    $sheet->setCellValue("A1", "Expense Report");
    $sheet->setCellValue("A2", "Date:");
    $sheet->setCellValue("B2", $_POST['date']);
    $sheet->setCellValue("A3", "From:");
    $sheet->setCellValue("B3", "{$_POST['fname']} {$_POST['lname']} <{$_POST['email']}>");
    $sheet->setCellValue("A5", "Items:");

    $sheet->getStyle("A1")->applyFromArray($styleBold);
    $sheet->getStyle("A2")->applyFromArray($styleBold);
    $sheet->getStyle("A3")->applyFromArray($styleBold);
    $sheet->getStyle("A5")->applyFromArray($styleBold);

    $s = 6;
    $l = $s;
    for ($c = 0; $c < count($_POST['item']); $c++)
    {
        $sheet->setCellValue("A{$l}", $c+1);
        $sheet->setCellValue("B{$l}", trim($_POST['item'][$c]));
        $sheet->setCellValue("C{$l}", trim($_POST['item_cost'][$c]));
        $sheet->setCellValue("D{$l}", trim($_POST['item_cur'][$c]));
        $sheet->setCellValue("E{$l}", trim($_POST['paid_cost'][$c]));
        $sheet->setCellValue("F{$l}", trim($_POST['paid_cur'][$c]));
        $l++;
    }
    $f = $l - 1;
    $t = $l + 1;

    $sheet->setCellValue("A{$t}", "Totals:");
    $sheet->setCellValue("C{$t}", "=SUM(C{$s}:C{$f})");
    $sheet->setCellValue("E{$t}", "=SUM(E{$s}:E{$f})");
    $sheet->getStyle("A{$t}")->applyFromArray($styleBold);

    $t = $t + 2;
    $sheet->setCellValue("A{$t}", $_POST['notes']);

    $writer = new Xlsx($spreadsheet);
    ob_start();
    $writer->save('php://output');
    $excelOutput = ob_get_clean();

    $date = date("Ymd", time());
    $user = preg_replace('/(.*)\@(.*)/', '$1', $_POST['email']);

    $email = new PHPMailer();
    $email->SetFrom('noreply@example.com', 'HR Admin');
    $email->Subject   = "[Expense Report] - {$user}";
    $email->Body      = "Expense Report\n".
                        "From: {$_POST['fname']} {$_POST['lname']} <{$_POST['email']}>\n".
                        "PayPal: <{$_POST['paypal']}>\n".
                        "\n".
                        "Please review.\n\n{$_POST['notes']}";
    $email->AddAddress($config['email_to'], "HR Review");
    $email->AddAddress($_POST['email'], "{$_POST['fname']} {$_POST['lname']}");

    $email->AddStringAttachment($excelOutput,
        "Expense-{$user}-{$date}.xls", 'base64', 'application/vnd.ms-excel');

    if (!empty($_FILES['files']['tmp_name']) and is_array($_FILES['files']['tmp_name']))
    {
        for ($f = 0; $f < count($_FILES['files']['tmp_name']); $f++)
        {
            if (is_uploaded_file($_FILES['files']['tmp_name'][$f]))
                $email->AddAttachment($_FILES['files']['tmp_name'][$f], $_FILES['files']['name'][$f]);
        }
    }

    if (!$email->Send())
        $out = $email->ErrorInfo;
    else
        $out = "OK";

}
catch (Exception $e)
{
    $out = $e->getMessage();
}

header("Content-type: application/x-javascript; charset=UTF-8");
echo json_encode($out);
exit();

?>
