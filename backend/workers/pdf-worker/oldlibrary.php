<?
ini_set('display_errors', 1);
error_reporting(E_ALL);
include "simple_html_dom.php";
require FCPATH . '/vendor/autoload.php';

use Dompdf\Dompdf;
use Dompdf\Options;



class mebbisbot
{
  public $curl;
  public $uid;
  public $tbMebbisId;
  private $baseUrl = "mebbisyd.meb.gov.tr";
  public $template;
  public $yetki;
  public $cronClass;
  public $path;


  public $userpath = "";
  public $simtemplatepath = "";
  /** @var simple_html_dom */
  public $sesimdomhtml = "";
  /** @var simple_html_dom */
  public $anagruphtml = "";
  /** @var simple_html_dom */
  public $ek4html = "";
  /** @var simple_html_dom */
  public $liste2html = "";
  public $mpdf = "";
  public $lastpath = "";
  /** @var get_instance */
  public $CI;
  private $maxdate = false;
  private $mindate = false;






  public $dompdf;
  public $htmp2pdf;
  public $rjson;
  public $companyName = "";
  public $grpp = [];
  public $perminute = 10;
  public $mebbisService;
  public function __construct()
  {

    $this->CI = &get_instance();
    $this->CI->load->library('curl');
    $this->CI->load->library('pdfCreateStatuses');
    $this->CI->load->library('MebbisService');
    $this->CI->load->helper('url');

    $this->simtemplatepath = FCPATH . "storage/simulatortemplates/";
    $this->curl = $this->CI->curl;
    $this->sesimdomhtml = new simple_html_dom();
    $this->anagruphtml = new simple_html_dom();
    $this->ek4html = new simple_html_dom();
    $this->liste2html = new simple_html_dom();
    $this->mebbisService = $this->CI->mebbisservice;
    /*$boshtml = $this->simtemplatepath.'bos.html';
       $this->sesimdomhtml->load_file($boshtml);
      $this->anagruphtml->load_file($boshtml);
      $this->ek4html->load_file($boshtml);
      */
    $this->sesimdomhtml->load_file($this->simtemplatepath . 'sesim/sesim.html');
    $this->anagruphtml->load_file($this->simtemplatepath . 'anagrup/anagrup.html');
    $this->ek4html->load_file($this->simtemplatepath . 'ek4/ek4.html');


    $grpp[] = "ALGI VE REFLEKS SİMÜLASYONU";
    $grpp[] = "DEĞİŞİK HAVA KOŞULLARI SİMÜLASYONU";
    $grpp[] = "DİREKSİYON EĞİTİM ALANI SİMÜLASYONU";
    $grpp[] = "GECE, GÜNDÜZ SİSLİ HAVA SİMÜLASYONU";
    $grpp[] = "İNİŞ ÇIKIŞ EĞİMLİ YOL SİMÜLASYONU";
    $grpp[] = "PARK EĞİTİMİ SİMÜLASYONU";
    $grpp[] = "ŞEHİR İÇİ YOL SİMÜLASYONU";
    $grpp[] = "ŞEHİRLER ARASI YOL SİMÜLASYONU";
    $grpp[] = "TRAFİK İŞARETLERİ SİMÜLASYONU";
    $grpp[] = "TRAFİK ORTAMI SİMÜLASYONU";
    $grpp[] = "VİRAJLI YOLDA SÜRÜŞ SİMÜLASYONU";
    $this->grpp = $grpp;

    $this->CI->db->query('update tb_mebbis set status = 4 WHERE updated < NOW() - INTERVAL 15 MINUTE AND status =5');
  }

  function setDate($mindate, $maxdate)
  {
    if ($mindate && $maxdate) {
      $this->mindate = $mindate;
      $this->maxdate = $maxdate;
    }
  }


  public function liste2uret($adaybilgi, $tablobilgi)
  {

    $sinif = $adaybilgi["gecissinif"];
    $sinif = explode("|", $sinif);
    $kacli = $sinif["1"];
    $sinif = explode(",", $sinif[0]);
    $sinif = $sinif[1];

    //$kacli=count($tablobilgi);

    $simulatorlu = false;
    foreach ($tablobilgi as $v) {
      if ($v[5] == "Simulatör" || $v[5] == "Direksiyon Eğitim Alanı") {
        $simulatorlu = true;
      }
    }
    /*
    print_r($tablobilgi);
    exit();
  */
    $dosya = "";
    if ($simulatorlu && in_array($kacli, [12, 14, 16])) {
      $dosya = $kacli . "nsimli";
    } else {
      $dosya = $kacli . "n";
      for ($i = 0; $i < count($tablobilgi); $i++) {
        if ($tablobilgi[$i][5] == "Simulatör" || $tablobilgi[$i][5] == "Direksiyon Eğitim Alanı") {
          unset($tablobilgi[$i]);
        }
      }
      $tablobilgi = array_values($tablobilgi);
    }


    $this->liste2html->load_file($this->simtemplatepath . 'liste2/' . $dosya . '.html');
    $htmlf = $this->liste2html;
    $htmlf->find(".name", 0)->innertext = $adaybilgi["ad-soyad"];
    $htmlf->find(".tc", 0)->innertext = $adaybilgi["tc-kimlik-no"];
    $htmlf->find(".vClass", 0)->innertext = $sinif;

    $dates = $htmlf->find(".date");
    $ix = 0;
    foreach ($dates as $date) {
      if (isset($tablobilgi[$ix])) {
        $date->innertext = "<span style='font-size:9px'>" . $tablobilgi[$ix][6] . "</span><br><span style='font-size:7px'>" . $tablobilgi[$ix][7] . "</span>";
      }
      $ix += 1;
    }

    $ix = 0;
    $plakalar = $htmlf->find(".plate");
    foreach ($plakalar as $plaka) {
      if (isset($tablobilgi[$ix])) {
        $plaka->innertext = str_replace("(Manuel)", "", $tablobilgi[$ix][4]);
      }
      $ix += 1;
    }
    $ix = 0;
    $mtrainer = $htmlf->find(".mTrainer");
    foreach ($mtrainer as $tran) {
      if (isset($tablobilgi[$ix])) {
        $tran->innertext = $tablobilgi[$ix][8];
      }
      $ix += 1;
    }
    $dompdf = new Dompdf();
    $dompdf->loadHtml($htmlf);
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();
    $path = $this->userpath . "/";
    return $dompdf->stream($adaybilgi["tc-kimlik-no"] . "direktakp.pdf", array("Attachment" => true));

    //echo $this->userpath;
    //return $this->savepdf($htmlf,$path,"aaa.pdf",false);
  }


  public function sim2tekliuret($adaybilgi, $tablobilgi)
  {
    //echo "asdfd\n";
    //print_r($adaybilgi);
    //print_r($tablobilgi);
    /*

      Array
      (
          [tc-kimlik-no] => 35254907836
          [ad-soyad] => MAKBULE GÜNDÜZ
          [kurum-adi] => 99948474/ÖZEL YAZIR ATLANTİS MOTORLU TAŞIT SÜRÜCÜLERİ KURSU
          [donemi] => 2017 - Aralık
          [grubu] => Grup-1
          [subesi] => A
          [mevcut-surucu-belgesi] =>  
          [istenen-sertifika] => B SINIFI SERTİFİKA (Manuel)
          [kurum-onay-durumu] => Onaylandı
          [ilce-onay-durumu] => Onaylandı
          [trafik] => Muaf veya Geçti
          [motor] => Muaf veya Geçti
          [ilk-yardim] => Muaf veya Geçti
          [uygulama] => Sorumlu
          [durumu] => Uygulama Sınav Hakkı Doldu
          [teorik-hak] => 3
          [uygulama-hak] => 0
          [e-sinav-hak] => 4
      )


      Array
        (
            [0] => 2017 - Aralık
            [1] => Grup 1
            [2] => 10/12/2017
            [3] => A ŞUBESİ
            [4] => 4217012017015 
            [5] => Simulatör
            [6] => 24/01/2018
            [7] => 17:00 - 17:50
            [8] => ULVİYE PALAMUT
            [9] => Normal Eğitim
        )
      */

    $rjson = $tablobilgi;


    $tc_kimlik_no = $adaybilgi['tc-kimlik-no'];
    $kursiyer = $adaybilgi['ad-soyad'];
    $kurum_adi = $adaybilgi['kurum-adi'];
    $donemi = $adaybilgi['donemi'];
    $grubu = $adaybilgi['grubu'];
    $subesi = $adaybilgi['subesi'];
    $mevcut_surucu_belgesi = $adaybilgi['mevcut-surucu-belgesi'];
    $istenen_sertifika = $adaybilgi['istenen-sertifika'];
    $kurum_onay_durumu = $adaybilgi['kurum-onay-durumu'];
    $ilce_onay_durumu = $adaybilgi['ilce-onay-durumu'];
    $trafik = isset($adaybilgi['trafik']) ? $adaybilgi['trafik'] : '';
    $motor = isset($adaybilgi['motor']) ? $adaybilgi['motor'] : '';
    $ilk_yardim = isset($adaybilgi['ilk-yardim']) ? $adaybilgi['ilk-yardim'] : '';
    $uygulama = $adaybilgi['uygulama'];
    $durumu = $adaybilgi['durumu'];
    $teorik_hak = $adaybilgi['teorik-hak'];
    $uygulama_hak = $adaybilgi['uygulama-hak'];
    $e_sinav_hak = $adaybilgi['e-sinav-hak'];





    if (count($tablobilgi) > 1) {
      usort($tablobilgi, function ($a, $b) {
        $dateA = strtotime(str_replace('/', '-', $a[6]));
        $dateB = strtotime(str_replace('/', '-', $b[6]));
        $timeA = strtotime($a[7]);
        $timeB = strtotime($b[7]);

        if ($dateA == $dateB) {
          return $timeA < $timeB ? 1 : -1;
        }

        return $dateA < $dateB ? 1 : -1;
      });

      // Get the latest two records
      $tablobilgi = array_slice($tablobilgi, 0, 2);

      $record = $tablobilgi[0];
      $recordo = $tablobilgi[1];

      $donemi = $record[0];
      $grup_adi = $record[1];
      $grup_baslama_tarihi = $record[2];
      $subesi = $record[3];
      $arac_plakasi = $record[4];
      $ders_yeri = $record[5];
      $ders_tarihi = $record[6];
      $ders_saati = $record[7];
      $dersi_veren_personel = $record[8];
      $egitim_turu = $record[9];


      $kursiyero = "";
      $tarih = $ders_tarihi;
      $kursiyer = $adaybilgi['ad-soyad'];
      $plaka = $arac_plakasi;
      $egitmen = $dersi_veren_personel;
      $egitimtarih = $ders_tarihi;
      $egitimsaat = $ders_saati;


      $donemi = $recordo[0];
      $grup_adi = $recordo[1];
      $grup_baslama_tarihi = $recordo[2];
      $subesi = $recordo[3];
      $arac_plakasi = $recordo[4];
      $ders_yeri = $recordo[5];
      $ders_tarihi = $recordo[6];
      $ders_saati = $recordo[7];
      $dersi_veren_personel = $recordo[8];
      $egitim_turu = $recordo[9];


      $tariho = $ders_tarihi;
      $kursiyero = $kursiyer;
      $egitmeno = $dersi_veren_personel;
      $egitimtariho = $ders_tarihi;
      $egitimsaato = $ders_saati;
    } else if (count($tablobilgi) == 1) {

      $record = $tablobilgi[0];
      $donemi = $record[0];
      $grup_adi = $record[1];
      $grup_baslama_tarihi = $record[2];
      $subesi = $record[3];
      $arac_plakasi = $record[4];
      $ders_yeri = $record[5];
      $ders_tarihi = $record[6];
      $ders_saati = $record[7];
      $dersi_veren_personel = $record[8];
      $egitim_turu = $record[9];


      $kursiyero = "";
      $tarih = $ders_tarihi;
      $kursiyer = $adaybilgi['ad-soyad'];
      $plaka = $arac_plakasi;
      $egitmen = $dersi_veren_personel;
      $egitimtarih = $ders_tarihi;
      $egitimsaat = $ders_saati;
    } else {
      exit("aday bilgi kayıt yok");
    }











    if ($this->template == 1) {
      if ($kursiyer == $kursiyero) {
        $sonuc = $this->anagrupp($tariho, $tarih, $kursiyer, $egitmen, $egitimsaato, $egitimsaat, $egitimtariho, $egitimtarih, $tc_kimlik_no);
      } else {
        $sonuc = $this->anagrupptekli($tarih, $kursiyer, $egitmen, $egitimsaat, $egitimtarih, $tc_kimlik_no);
      }
    } else {
      if ($kursiyer == $kursiyero) {
        $sonuc = $this->sesimkaydet2($tariho, $tarih, $kursiyer, $egitmen, $egitimsaato, $egitimsaat, $egitimtariho, $egitimtarih);
      } else {
        $sonuc = $this->sesimkaydet($tarih, $kursiyer, $egitmen, $egitimsaat, $egitimtarih);
      }
    }
    $sonuc2 = $this->saveek4($kursiyer, $plaka, $this->companyName, $egitimtarih, $tarih, $egitmen);
  }





  public function liste2uretToPdf($adaybilgi, $tablobilgi)
  {

    $sinif = $adaybilgi["istenen-sertifika"];
    $sinif = explode(" ", $sinif);
    $sinif = $sinif[0];
    $kacli = count($tablobilgi);

    //$kacli=count($tablobilgi);

    $simulatorlu = false;
    foreach ($tablobilgi as $v) {
      if ($v[5] == "Simulatör" || $v[5] == "Direksiyon Eğitim Alanı") {
        $simulatorlu = true;
      }
    }



    $dosya = "";
    if ($simulatorlu && in_array($kacli, [12, 14, 16])) {
      $dosya = $kacli . "nsimli";
    } else {
      $dosya = $kacli . "n";
      for ($i = 0; $i < count($tablobilgi); $i++) {
        if ($tablobilgi[$i][5] == "Simulatör" || $tablobilgi[$i][5] == "Direksiyon Eğitim Alanı") {
          unset($tablobilgi[$i]);
        }
      }
      $tablobilgi = array_values($tablobilgi);
    }

    if (file_exists($this->simtemplatepath . 'liste2/' . $dosya . '.html')) {


      $this->liste2html->load_file($this->simtemplatepath . 'liste2/' . $dosya . '.html');
      $htmlf = $this->liste2html;
      $htmlf->find(".name", 0)->innertext = $adaybilgi["ad-soyad"];
      $htmlf->find(".tc", 0)->innertext = $adaybilgi["tc-kimlik-no"];
      $htmlf->find(".vClass", 0)->innertext = $sinif;

      $dates = $htmlf->find(".date");
      $ix = 0;
      foreach ($dates as $date) {
        if (isset($tablobilgi[$ix])) {
          $date->innertext = "<span style='font-size:9px'>" . $tablobilgi[$ix][6] . "</span><br><span style='font-size:7px'>" . $tablobilgi[$ix][7] . "</span>";
        }
        $ix += 1;
      }

      $ix = 0;
      $plakalar = $htmlf->find(".plate");
      foreach ($plakalar as $plaka) {
        if (isset($tablobilgi[$ix])) {
          $plaka->innertext = str_replace("(Manuel)", "", $tablobilgi[$ix][4]);
        }
        $ix += 1;
      }
      $ix = 0;
      $mtrainer = $htmlf->find(".mTrainer");
      foreach ($mtrainer as $tran) {
        if (isset($tablobilgi[$ix])) {
          $tran->innertext = $tablobilgi[$ix][8];
        }
        $ix += 1;
      }



      return $this->savepdf($htmlf, $this->userpath . "pdf/direktakpliste/" . $this->seo($adaybilgi["donemi"]) . "/", $this->seo($adaybilgi["tc-kimlik-no"] . $adaybilgi["ad-soyad"]) . ".pdf");
      //echo $this->userpath;
      //return $this->savepdf($htmlf,$path,"aaa.pdf",false);
    } else {
      return false;
    }
  }


  public function liste2getbilgi($tcno)
  {
    //sleep 10 seconds
    sleep(5);
    $r = $this->getir2($tcno);

    /////////////////////
    $adaybilgilerbaslik = $r->find("#dgDonemBilgileri>tr", 0);
    if (!$adaybilgilerbaslik) {
      //$this->session->set_flashdata("error","Tcno Bulunamadı");
      return false;
    }
    $adaybilgiler = $r->find("#dgDonemBilgileri>tr");
    $adaybilgiler = end($adaybilgiler);
    $basliktd = $adaybilgilerbaslik->find("td");
    $bilgilertd = $adaybilgiler->find("td");
    $baslikarray = [];
    for ($i = 0; $i < count($bilgilertd); $i++) {
      $baslikarray[$this->permalink($basliktd[$i]->innertext)] = $bilgilertd[$i]->innertext;
    }
    $donemi = $baslikarray["donemi"];

    $pnlDersProgreami = $r->find("#pnlDersProgreami>table>tr>td>table>tr");
    $ix = 0;
    $derspro = [];
    foreach ($pnlDersProgreami as $derspr) {
      $dersprtd = $derspr->find("td");
      $dersprnew = [];
      foreach ($dersprtd as $td) {
        $dersprnew[] = $td->innertext;
      }
      if ($dersprnew[0] == $donemi && $dersprnew[9] != "Başarısız Aday Eğitimi") {
        $derspro[] = $dersprnew;
      }
    }


    // echo ($r->innertext);

    if (!isset($baslikarray["tc-kimlik-no"])) {
      //$this->session->set_flashdata("error","!Tcno Bulunamadı.");
      return false;
    }
    //$baslikarray["gecissinif"]=$sinif;
    return compact("baslikarray", "derspro");
  }


  public function getirdirektakpliste()
  {
    $curl = $this->curl;
    $r = $curl->getPage("https://" . $this->baseUrl . "/SKT/skt00001.aspx");
    $r = $curl->getPage("https://" . $this->baseUrl . "/SKT/skt02006.aspx");

    $data = [];
    $html = new simple_html_dom();
    $html->load($r);
    //find inputs from form#FRM_SKT02006
    $formElements = $html->find("form#FRM_SKT02006", 0);
    if (!$formElements)
      throw new Error("form bulunamadı");
    foreach ($formElements->find('input') as $element)
      $data[$element->name] = $element->value;


    ////
    $cmbKurum = $html->find("span#SktPageHeader1_lblKurumKodu", 0);
    $dataU = array(
      'companyName' => $cmbKurum->innertext,
    );

    $this->CI->db->set($dataU)->where(array('id' => $this->tbMebbisId))->update('tb_mebbis');
    $this->companyName = $cmbKurum->innertext;
    //////////////////////   

    $data["hdnKayitSec"] = "";
    $data["hiddenKaydet"] = "";
    $data["hdnKayitNoSilmeIcin"] = "";
    $data["txtTcKimlikNo"] = "";
    $data["cmbEgitimDonemi"] = 1;
    $data["cmbGrubu"] = -1;
    $data["cmbSubesi"] = -1;
    $data["cmbOgrenciDurumu"] = "0";
    $data["cmbDurumu"] = "4";



    $r = $curl->postPage("https://" . $this->baseUrl . "/SKT/skt02006.aspx", $data);
    log_message("error", $curl->getHttpCode());
    log_message("error", $curl->getHeader());
    $html = new simple_html_dom();
    $html->load($r);
    $table = $html->find("table.frmList", 0);
    if (!$table) {
      log_message("error", "tablo bulunamadı");
      return 0;
    };
    $rjson = [];
    $i = 0;

    foreach ($table->find("tr") as $tr) {
      $rjsontr = [];
      //if($i++==0)continue;//ilk satir  thead sutun tanımlamaları sil tc no adı sopyadı.. 
      foreach ($tr->find("td") as $td) {
        $rjsontr[] = strip_tags($td->innertext);
      }
      $rjson[] = $rjsontr;
    }
    log_message("error", $this->userpath . "pdf/");



    $curl->createPath($this->userpath . "pdf/");
    $fp = fopen($this->userpath . 'records.csv', 'wb');
    $i = 0;
    for ($i = 0; $i < count($rjson); $i++) {
      $record = $rjson[$i];

      if ($i != 0) {
        //fputcsv($fp, array_keys($record));
        fputcsv($fp, array_values($record));
      }
    }
    fclose($fp);
    $this->rjson = $rjson;
  }

  public function getirSertifikaKazananlar()
  {
    $curl = $this->curl;
    $r = $curl->getPage("https://" . $this->baseUrl . "/SKT/skt00001.aspx");
    $r = $curl->getPage("https://" . $this->baseUrl . "/SKT/skt02006.aspx");

    $html = new simple_html_dom();
    $html->load($r);

    // Get education periods from select element
    $educationPeriods = [];
    $selectElement = $html->find('select[name="cmbEgitimDonemi"]', 0);
    if ($selectElement) {
      foreach ($selectElement->find('option') as $option) {
        if ( // convert to int and check if less then 100
          (int)$option->value < 100
        ) continue;
        $educationPeriods[$option->value] = $option->innertext;
      }
    }

    // Get form elements
    $formElements = $html->find("form#FRM_SKT02006", 0);
    if (!$formElements) {
      throw new Error("form bulunamadı");
    }

    // Build base data array from form inputs
    $baseData = [];
    foreach ($formElements->find('input') as $element) {
      $baseData[$element->name] = $element->value;
    }

    // Update company information
    $cmbKurum = $html->find("span#SktPageHeader1_lblKurumKodu", 0);
    if ($cmbKurum) {
      $dataU = array(
        'companyName' => $cmbKurum->innertext,
      );
      $this->CI->db->set($dataU)->where(array('id' => $this->tbMebbisId))->update('tb_mebbis');
      $this->companyName = $cmbKurum->innertext;
    }

    // Set default form values
    $baseData["hdnKayitSec"] = "";
    $baseData["hiddenKaydet"] = "";
    $baseData["hdnKayitNoSilmeIcin"] = "";
    $baseData["txtTcKimlikNo"] = "";
    $baseData["cmbGrubu"] = -1;
    $baseData["cmbSubesi"] = -1;
    $baseData["cmbOgrenciDurumu"] = "5";
    $baseData["cmbDurumu"] = "4";

    // Initialize result array
    $allResults = [];

    // Collect data for each education period
    foreach ($educationPeriods as $periodId => $periodName) {
      $data = $baseData;
      $data["cmbEgitimDonemi"] = $periodId;

      $r = $curl->postPage("https://" . $this->baseUrl . "/SKT/skt02006.aspx", $data);

      // Log response information
      log_message("error", "Period {$periodId} HTTP Code: " . $curl->getHttpCode());

      $periodHtml = new simple_html_dom();
      $periodHtml->load($r);
      $table = $periodHtml->find("table.frmList", 0);

      if ($table) {
        $periodResults = [];
        foreach ($table->find("tr") as $index => $tr) {
          //if ($index === 0) continue; // Skip header row

          $row = [];
          foreach ($tr->find("td") as $td) {
            $row[] = strip_tags($td->innertext);
          }
          if (!empty($row)) {
            $row[] = $periodName; // Add period information
            $periodResults[] = $row;
          }
        }
        echo "Period {$periodId} - {$periodName} - Found " . count($periodResults) . " records\n";
        $allResults = array_merge($allResults, $periodResults);
      }
    }

    // Ensure directory exists
    $curl->createPath($this->userpath . "pdf/");

    // Write results to CSV
    $fp = fopen($this->userpath . 'recordsSertifika.csv', 'wb');
    foreach ($allResults as $record) {
      fputcsv($fp, $record);
    }
    fclose($fp);

    $this->rjson = $allResults;
    return count($allResults);
  }




  function setUid($tbMebbisId)
  {
    if (!($tbMebbisId > 0))
      throw new Error("tbMebbisId is not valid");
    $this->tbMebbisId = $tbMebbisId;
    $this->userpath = FCPATH . "storage/mebbisbot/tbMebbis$tbMebbisId/";
    $this->curl->cookieFile = FCPATH . "mebbisworker/storage/cookies/mebbis" . $tbMebbisId . ".txt.netscape.txt";
    $this->curl->cookiefile();
  }

  function setMebbisUid($uid)
  {
    $this->tbMebbisId = $uid;
  }

  function setTbMebbisId($tbMebbisId)
  {
    if (!($tbMebbisId > 0))
      throw new Error("tbMebbisId is not valid");
    $this->tbMebbisId = $tbMebbisId;
    $this->userpath = FCPATH . "storage/mebbisbot/tbMebbis$tbMebbisId/";
    $this->curl->cookieFile = FCPATH . "mebbisworker/storage/cookies/mebbis" . $tbMebbisId . ".txt.netscape.txt";
    $this->curl->cookiefile();
  }


  function setTemplate($template)
  {
    $this->template = $template;
    if ($this->template == 1) {
      $this->perminute = 10;
    } else {
      $this->perminute = 50;
    }
  }
  function setYetki($yetki)
  {
    $this->yetki = $yetki;
  }
  function setCompanyName($cn)
  {
    $this->companyName = $cn;
  }
  function saveek4($kursiyer, $plaka, $companyName, $tarih, $ay, $egitmen)
  {
    $html = $this->ek4html;
    foreach ($html->find('.sep') as $element)
      $element->class = $element->class . " hidden";
    $arrsep =
      array(
        array(
          "1",
          "2",
          "3",
        ),
        array(
          "4",
          "5",
          "6",
        ),
        array(
          "7",
          "8",
          "9",
        ),
        array(
          "10",
          "11",
          "12",
          "13",
        )
      );
    $arrsepi = array_rand($arrsep);
    $arrsep = $arrsep[$arrsepi];
    foreach ($arrsep as $i) {

      $html->find(".sep" . $i, 0)->class = "sep sep" . $i;
    }

    $html->find(".kursiyer", 0)->innertext = $kursiyer;
    $html->find(".plakano", 0)->innertext = $plaka;
    $html->find(".egitmen", 0)->innertext = $egitmen;
    //tr kaakter
    //$companyName= iconv("ISO-8859-9", "UTF-8",$companyName);
    $html->find(".companyName", 0)->innertext = strtoupper($companyName);
    $html->find(".tarih", 0)->innertext = $tarih;
    return $this->savepdf($html, $this->userpath . "pdf/sinav_sonuc_raporu/" . $this->seo($ay) . "/", $this->seo($kursiyer) . "ek4.pdf");
  }
  function login($uname, $pw)
  {
    $curl = $this->curl;
    $r = $curl->getPage("https://mebbis.meb.gov.tr/default.aspx");
    $data = [];
    $html = new simple_html_dom();
    $html->load($r);
    foreach ($html->find('input') as $element)
      $data[$element->name] = $element->value;
    $data["txtKullaniciAd"] = $uname;
    $data["txtSifre"] = $pw;
    $r = $curl->postPage("https://mebbis.meb.gov.tr/default.aspx", $data);
    if ($curl->getHttpCode() == 302) {
      $r = $curl->getPage("https://mebbis.meb.gov.tr/index.aspx");
      $r = $curl->getPage("https://mebbis.meb.gov.tr/main.aspx");
      $r = true;
    } else {
      $r = false;
    }


    return $r;
  }
  public function trylogin($tbMebbisId, $uname, $pw)
  {
    return $this->mebbisService->trylogin($tbMebbisId, $uname, $pw);
  }
  function test()
  {
    echo "asdf";
  }
  function keepAlive()
  {
    $curl = $this->curl;
    $text = $curl->getPage("https://" . $this->baseUrl . "/SKT/skt00001.aspx");
    preg_match('/>(\d+),(.+?)</', $text, $matches);

    if (!empty($matches)) {
      $code = $matches[1];    // 99985291
      $name = $matches[2];    // ÖZEL GAZİANTEP ÇELİK MOTORLU TAŞIT SÜRÜCÜLERİ KURSU
    }



    echo $name;
    $text = $curl->getPage("https://" . $this->baseUrl . "/SKT/skt04002.aspx");

    preg_match('/>(\d+),(.+?)</', $text, $matches);

    if (!empty($matches)) {
      $code = $matches[1];    // 99985291
      $name = $matches[2];    // ÖZEL GAZİANTEP ÇELİK MOTORLU TAŞIT SÜRÜCÜLERİ KURSU
    }

    echo $name;
  }

  function getir()
  {



    $curl = $this->curl;
    $r = $curl->getPage("https://" . $this->baseUrl . "/SKT/skt00001.aspx");

    $r = $curl->getPage("https://" . $this->baseUrl . "/SKT/skt04002.aspx");
    $html = new simple_html_dom();
    $html->load($r);
    $sonuc = "";



    $data = [];
    $rjson = [];
    $ix = 0;

    $cmbKurum = $html->find("select#cmbKurum>option", 1);

    if (!isset($cmbKurum->innertext))
      throw new Error("cmbKurum not found");
    $kurumclean = explode("(", $cmbKurum->innertext);
    $kurumclean = $kurumclean[0];
    echo $kurumclean . " kurumu\n";

    $data = array(
      'companyName' => $kurumclean,
    );


    $this->CI->db->set($data)->where(array('id' => $this->tbMebbisId))->update('tb_mebbis');
    $this->companyName = $kurumclean;
    $elemoptions = $html->find("select#cmbDonemi>option");
    /*
      $elems=[];
      foreach ($elemoptions as $f)$elems[]=$f->innertext.$f->value;
      print_r($elems);
      exit();
      */
    foreach ($elemoptions as $f) {
      echo $this->userpath . "pdf/" . $f->value . "\n";
      $this->cronClass->cronPercent($this->tbMebbisId, (++$ix) . "/" . count($elemoptions));
      foreach ($html->find('input') as $element)
        $data[$element->name] = $element->value;
      $data["hdnKayitSec"] = "";
      $data["hiddenKaydet"] = "";
      $data["hdnKayitNoSilmeIcin"] = "";
      $data["cmbIl"] = $html->find("select#cmbIl>option", 0)->value;
      $data["cmbIlce"] = $html->find("select#cmbIlce>option", 0)->value;
      $data["cmbKurum"] = $html->find("select#cmbKurum>option", 1)->value;

      $data["cmbDonemi"] = $f->value;
      $data["btnListeleGrid"] = "Listele";
      $r = $curl->postPage("https://" . $this->baseUrl . "/SKT/skt04002.aspx", $data);

      $html->load(($r));
      $ddlArac = $html->find("select#ddlArac>option");
      // $ddlPersonel = $html->find('select#ddlPersonel>option');
      if (!$ddlArac) continue;
      //foreach ($ddlPersonel as $personel) {
      foreach ($ddlArac as $arac) {
        echo $this->userpath . "pdf/" . $f->value . "." . $arac->value . "\n";
        usleep(250000); //quarter second
        //$arac->innertext = html_entity_decode($arac->innertext);  
        //file_put_contents( $this->userpath."pdf/".$f->value.".".$arac->value.".".$arac->innertext.".html",$html->innertext);
        //decode this from arac innertext Sim&#252;lat&#246;r
        if ($arac->value == -1) {
          //file_put_contents( $this->userpath."pdf/simli1213.".$f->value.".".$arac->value.".".$arac->innertext.".html",$html->innertext);
          continue;
        } else {
          //file_put_contents( $this->userpath."pdf/".$f->value.".".$arac->value.".".$arac->innertext.".html",$html->innertext);
        }


        foreach ($html->find('input') as $element) $data[$element->name] = $element->value;
        $data["hdnKayitSec"] = "";
        $data["hiddenKaydet"] = "";
        $data["hdnKayitNoSilmeIcin"] = "";
        $data["cmbIl"] = $html->find("select#cmbIl>option", 0)->value;
        $data["cmbIlce"] = $html->find("select#cmbIlce>option", 0)->value;
        $data["cmbKurum"] = $html->find("select#cmbKurum>option", 1)->value;
        //$data["ddlPersonel"] = $personel->value;
        $data["ddlArac"] = $arac->value;
        $r2 = $curl->postPage("https://" . $this->baseUrl . "/SKT/skt04002.aspx", $data);

        $html->load(($r2));

        $table = $html->find("table.frmList", 0);

        if (!$table)
          continue;

        foreach ($table->find("tr") as $tr) {
          $rjsontr = [];
          if ($this->yetki == "demo" && count($rjson) > 10) {
            break 2;
          }
          foreach ($tr->find("td") as $td) {

            $rjsontr[] = $td->innertext;
          }


          // zaman aralıgı dısındakileri alma



          /*$date = DateTime::createFromFormat("d/m/Y", $rjsontr[2]);
            $maxdate = DateTime::createFromFormat("Y-m-d", $this->maxdate);
            $mindate = DateTime::createFromFormat("Y-m-d", $this->mindate);
            if ($date >= $maxdate || $date <= $mindate) {
              continue;
            }*/

          //


          if (substr($rjsontr[6], 0, 7) == "Simulat" ||  substr($rjsontr[6], 0, 7) == "Simülat") {

            $rjson[] = $rjsontr;
          }
        }

        //$curl->createPath($this->userpath."html/");
        //file_put_contents($this->userpath."html/s".$f->value .".html",$html);
        //file_put_contents($this->userpath."html/raw" .$f->value .".html",$html->find(".frmList",0)->outertext);
        //if($ix++>7) break;

      }
    }
    $curl->createPath($this->userpath . "pdf/");


    $fp = fopen($this->userpath . 'records.csv', 'wb');
    $i = 0;
    for ($i = 0; $i < count($rjson); $i++) {
      $record = $rjson[$i];

      if ($i == 0) {
        fputcsv($fp, array_keys($record));
      }
      fputcsv($fp, array_values($record));
    }
    fclose($fp);
    $this->rjson = $rjson;


    return $rjson;
  }


  public function getir2($tc)
  {

    $curl = $this->curl;

    $r = $curl->getPage("https://mebbisyd.meb.gov.tr/SKT/skt00001.aspx");
    $r = $curl->getPage("https://mebbisyd.meb.gov.tr/SKT/skt02009.aspx");
    $html = new simple_html_dom();
    $html->load($r);

    $data = [];
    foreach ($html->find('input') as $element)
      $data[$element->name] = $element->value;
    $data["hdnKayitSec"] = "";
    $data["hiddenKaydet"] = "";
    $data["hdnKayitNoSilmeIcin"] = "";
    $data["txtTcKimlikNo"] = $tc;
    $data["ImageButton1.x"] = "35";
    $data["ImageButton1.y"] = "13";
    $r = $curl->postPage("https://mebbisyd.meb.gov.tr/SKT/skt02009.aspx", $data);


    //$r=$curl->getPage("https://mtsk.harfkon.com.tr/storage/simulatortemplates/liste2/testveri.html");

    $html = new simple_html_dom();
    $html->load($r);



    return ($html);
  }


  public function readCsv()
  {

    $file = fopen($this->userpath . 'records.csv', 'r');
    if (!file_exists($this->userpath . 'records.csv'))
      throw new Error("records.csv not found");
    $rjson = [];
    while (($line = fgetcsv($file)) !== FALSE) {
      //$line is an array of the csv elements
      $rjson[] = ($line);
    }
    fclose($file);
    $this->rjson = $rjson;
  }
  public function recordstopdf() // tekli
  {
    $rjson = $this->rjson;
    for ($i = 0; $i < count($rjson); $i++) {
      $record = $rjson[$i];
      $recordo = [];
      $kursiyero = "";
      $tarih = $record[0];
      $tckimlikno = $record[2];
      $kursiyer = $record[4];
      $plaka = $record[5];
      $egitmen = $record[9];
      $egitimtarih = $record[7];
      $egitimsaat = $record[8];

      if ($i > 0) {
        $recordo = $rjson[$i - 1];
        $tariho = $recordo[0];
        $kursiyero = $recordo[4];
        $egitmeno = $recordo[9];
        $egitimtariho = $recordo[7];
        $egitimsaato = $recordo[8];
      }

      if ($this->template == 2) {
      } else if ($this->template == 1) {
        if ($kursiyer == $kursiyero) {
          $this->anagrupp($tariho, $tarih, $kursiyer, $egitmen, $egitimsaato, $egitimsaat, $egitimtariho, $egitimtarih, $tckimlikno);
        } else {
          $this->anagrupptekli($tarih, $kursiyer, $egitmen, $egitimsaat, $egitimtarih, $tckimlikno);
        }
      } else {
        if ($kursiyer == $kursiyero) {
          $this->sesimkaydet2($tariho, $tarih, $kursiyer, $egitmen, $egitimsaato, $egitimsaat, $egitimtariho, $egitimtarih);
        } else {
          $this->sesimkaydet($tarih, $kursiyer, $egitmen, $egitimsaat, $egitimtarih);
        }
      }
      $this->saveek4($kursiyer, $plaka, $this->companyName, $egitimtarih, $tarih, $egitmen);
      $this->cronClass->cronPercent($this->tbMebbisId, ($i + 1) . "/" . count($rjson));
    }
  }
  public function recordstopdfpercent($percent)
  {

    if ($percent == 0)
      $percent = 1;
    $rjson = $this->rjson;
    $max = count($rjson);
    $maxrjson = count($rjson);
    if ($max > $percent + $this->perminute)
      $max = $percent + $this->perminute;

    for ($i = $percent; $i < $max; $i++) {

      $this->cronClass->cronPercent($this->tbMebbisId, ($i + 1) . "/" . count($rjson));

      //if(!isset($rjson[$i]))continue;//max rjsondan büyük olabliyor gibi???? asagida max++ var
      $record = $rjson[$i];
      $recordo = [];
      $kursiyero = "";
      $tarih = $record[0];

      $tckimlikno = isset($record[11]) ? $record[11] : ""; // cokluda tcno gelmiyor 
      $kursiyer = $record[4];
      $plaka = $record[5];
      $egitmen = $record[9];
      $egitimtarih = $record[7];
      $egitimsaat = $record[8];

      if ($i > 0) {
        $recordo = $rjson[$i - 1];
        $tariho = $recordo[0];
        $kursiyero = $recordo[4];
        $egitmeno = $recordo[9];
        $egitimtariho = $recordo[7];
        $egitimsaato = $recordo[8];
      }

      $kursiyersonraki = "";
      if ($maxrjson > $i) {
        $recordsonraki = $rjson[$i + 1];
        $kursiyersonraki = $recordsonraki[4];
      }
      if ($kursiyer == $kursiyersonraki)
        continue;  //sonrakisi kendiyle aynı ise atla sonrakini işle


      $sonuc = "";

      if ($this->template == 1) {
        if ($kursiyer == $kursiyero) {
          $sonuc = $this->anagrupp($tariho, $tarih, $kursiyer, $egitmen, $egitimsaato, $egitimsaat, $egitimtariho, $egitimtarih,    $tckimlikno);
        } else {
          $sonuc = $this->anagrupptekli($tarih, $kursiyer, $egitmen, $egitimsaat, $egitimtarih,    $tckimlikno);
        }
      } else {
        if ($kursiyer == $kursiyero) {
          $sonuc = $this->sesimkaydet2($tariho, $tarih, $kursiyer, $egitmen, $egitimsaato, $egitimsaat, $egitimtariho, $egitimtarih);
        } else {
          $sonuc = $this->sesimkaydet($tarih, $kursiyer, $egitmen, $egitimsaat, $egitimtarih);
        }
      }
      $sonuc2 = $this->saveek4($kursiyer, $plaka, $this->companyName, $egitimtarih, $tarih, $egitmen);

      if (($sonuc == pdfCreateStatuses::$exists || $sonuc2 == pdfCreateStatuses::$exists) && $max < $maxrjson) {
        $max++;
      }
      //eger zaten varsa bunu percentlimite sayma olarak sayma
    }
  }

  public function recordstopdfpercentdirektakp($percent)
  {
    if ($percent == 0)
      $percent = 1;
    $rjson = $this->rjson;
    $max = count($rjson);
    $maxrjson = count($rjson);
    if ($max > $percent + $this->perminute)
      $max = $percent + $this->perminute;

    for ($i = $percent; $i < $max; $i++) {

      $this->cronClass->cronPercent($this->tbMebbisId, ($i + 1) . "/" . count($rjson));
      $record = $rjson[$i];
      $bilgi = ($this->liste2getbilgi($record[2]));
      print_r($bilgi);
      if ($bilgi) {
        $this->liste2uretToPdf($bilgi["baslikarray"], $bilgi["derspro"]);
      }
    }
  }

  function removeFolder($path)
  {
    $dir = $path;
    if (!file_exists($dir)) {
      return 0;
    }
    $it = new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS);
    $files = new RecursiveIteratorIterator($it, RecursiveIteratorIterator::CHILD_FIRST);
    foreach ($files as $file) {
      if ($file->isDir()) {
        rmdir($file->getRealPath());
      } else {
        unlink($file->getRealPath());
      }
    }
    rmdir($dir);
  }

  function removeFolders()
  {
    //$this->removeFolder($this->userpath . "pdf");
    //$this->removeFolder($this->userpath . "html");
  }
  function sesimkaydet($tarih, $kursiyer, $egitmen, $egitimsaat, $egitimtarih)
  {

    $html = $this->sesimdomhtml;
    $saataralik = $egitimsaat;
    $egitimsaat = str_replace(" ", "", $egitimsaat); //13:00 - 13:50
    $egitimsaat = explode("-", $egitimsaat); //13:00,13:50
    $date = $egitimsaat[0] . ":00";
    $egitimsaat1 = date('H:i:s', strtotime($date));
    $egitimsaat2 = date('H:i:s', strtotime($date));
    $saatss = date('H:i', strtotime($egitimsaat1 . ' +60 minutes'));
    $saatss2 = date('H:i', strtotime($egitimsaat1 . ' +110 minutes'));

    $html->find(".kursiyer", 0)->innertext = $kursiyer;
    $html->find(".egitmen", 0)->innertext = $egitmen;
    //$html->find('.ehliyetsinif', 0)->innertext = "B";
    $html->find(".egitimsuresi", 0)->innertext = $egitimtarih . " " . $saataralik . " / " . $saatss . " - " . $saatss2; //15.02.2022 08:00 - 16.02.2022 09:00    
    $cizelge = "";

    //$egitimsaat1=explode(":",$egitimsaat[0]); //13:00,13:50
    //$egitimsaat2=explode(":",$egitimsaat[1]);  





    for ($i = 0; $i < 16; $i++) {
      $sure = "00:06";
      if ($i == 8) {
        $egitimsaat1 = date('H:i:s', strtotime($egitimsaat1 . ' +18 minutes'));
        $egitimsaat2 = date('H:i:s', strtotime($egitimsaat2 . ' +18 minutes'));
      }
      $egitimsaat1 = date('H:i:s', strtotime($egitimsaat1));
      $egitimsaat2 = date('H:i:s', strtotime($egitimsaat1 . ' +6 minutes'));
      if ($i == 15 || $i == 7) {
        $egitimsaat2 = date('H:i:s', strtotime($egitimsaat1 . ' +8 minutes'));
        $sure = "00:08";
      }
      $cizelge .= "  
              <tr>
                <td>" . ($i + 1) . "</td>
                <td>$egitimtarih</td>
                <td>$egitimsaat1</td>
                <td>$egitimsaat2</td>
                <td>$sure</td>
                <td>1</td>
                <td>" . rand(80, 100) . "</td>
              </tr>";
      if ($i != 7) {
        $egitimsaat1 = date('H:i:s', strtotime($egitimsaat1 . ' +6 minutes'));
      }
    }
    $html->find(".cizelgetr", 0)->innertext = $cizelge;
    $path = $this->userpath . "pdf/egitim_kayitlari/" . $this->seo($tarih) . "/";
    /*
      //mpdf output
      $mpdf = new \Mpdf\Mpdf();
      $mpdf->WriteHTML($html);    
      $this->curl->createPath ($this->userpath."pdf/sesim/".$this->seo($tarih)."/");
      $mpdf->Output($this->userpath."pdf/sesim/".$this->seo($tarih)."/".$this->seo($kursiyer).".pdf",'F'); 
      */

    return $this->savepdf($html->outertext, $path, $this->seo($kursiyer) . ".pdf");
  }
  function sesimkaydet2($tarih, $tarih2, $kursiyer, $egitmen, $egitimsaat, $_egitimsaat, $egitimtarih, $egitimtarih2)
  {
    $html = $this->sesimdomhtml;
    $saataralik = $egitimsaat;
    $saataralik2 = $_egitimsaat;
    $egitimsaat = str_replace(" ", "", $egitimsaat); //13:00 - 13:50
    $egitimsaat = explode("-", $egitimsaat); //13:00,13:50

    $_egitimsaat = str_replace(" ", "", $_egitimsaat); //13:00 - 13:50
    $_egitimsaat = explode("-", $_egitimsaat); //13:00,13:50


    $date = $egitimsaat[0] . ":00";

    $date2 = $_egitimsaat[0] . ":00";

    $egitimsaat1 = date('H:i:s', strtotime($date));
    $egitimsaat2 = date('H:i:s', strtotime($date));

    $egitimsaat_baslangic = date('H:i:s', strtotime($date2));
    $egitimsaat_bitis = date('H:i:s', strtotime($date2));

    $html->find(".kursiyer", 0)->innertext = $kursiyer;
    $html->find(".egitmen", 0)->innertext = $egitmen;
    $html->find(".egitimsuresi", 0)->innertext = $egitimtarih . " " . $saataralik . " /  " . $egitimtarih2 . " " . $saataralik2; //15.02.2022 08:00 - 16.02.2022 09:00    
    $cizelge = "";

    //$egitimsaat1=explode(":",$egitimsaat[0]); //13:00,13:50
    //$egitimsaat2=explode(":",$egitimsaat[1]);  

    $tarihccc = $egitimtarih;
    for ($i = 0; $i < 16; $i++) {

      $sure = "00:06";
      if ($i == 8) {
        $egitimsaat1 = $egitimsaat_baslangic;
        $egitimsaat2 = date('H:i:s', strtotime($egitimsaat_bitis . ' +6 minutes'));
        $tarihccc = $egitimtarih2;
      }
      $egitimsaat1 = date('H:i:s', strtotime($egitimsaat1));
      $egitimsaat2 = date('H:i:s', strtotime($egitimsaat1 . ' +6 minutes'));
      if ($i == 15 || $i == 7) {
        $egitimsaat2 = date('H:i:s', strtotime($egitimsaat1 . ' +8 minutes'));
        $sure = "00:08";
      }
      $cizelge .= "  
              <tr>
                <td>" . ($i + 1) . "</td>
                <td>$tarihccc</td>
                <td>$egitimsaat1</td>
                <td>$egitimsaat2</td>
                <td>$sure</td>
                <td>" . ($i + 1) . "</td>
                <td>" . rand(80, 100) . "</td>
              </tr>";
      if ($i != 7) {
        $egitimsaat1 = date('H:i:s', strtotime($egitimsaat1 . ' +6 minutes'));
      }
    }
    $html->find(".cizelgetr", 0)->innertext = $cizelge;


    $path = $this->userpath . "pdf/egitim_kayitlari/" . $this->seo($tarih) . "/";
    $filename = $this->seo($kursiyer) . ".pdf";
    return $this->savepdf($html, $path, $filename);
  }
  function anagrupp($tariho, $tarih, $kursiyer, $egitmen, $egitimsaato, $egitimsaat, $egitimtariho, $egitimtarih, $tc_kimlik_no)
  {

    foreach ($this->grpp as $grp) {
      $this->anagrup($grp, $tariho, $tarih, $kursiyer, $egitmen, $egitimsaato, $egitimsaat, $egitimtariho, $egitimtarih, false, $tc_kimlik_no);
    }
    return $this->grpp;
  }
  public function anagrupptekli($tarih, $kursiyer, $egitmen, $egitimsaat, $egitimtarih, $tc_kimlik_no)
  {

    foreach ($this->grpp as $grp) {
      $this->anagrup($grp, $tarih, "", $kursiyer, $egitmen, $egitimsaat, "", $egitimtarih, "", true, $tc_kimlik_no);
    }

    return $this->grpp;
  }

  public function anagrup($baslik, $tarih, $tarih2, $kursiyer, $egitmen, $egitimsaat, $_egitimsaat, $egitimtarih, $egitimtarih2, $tekli = false, $tckimlikno)
  {


    $htmlf = $this->anagruphtml;
    $saataralik = $egitimsaat;
    $saataralik2 = $_egitimsaat;
    $egitimsaat = str_replace(" ", "", $egitimsaat); //13:00 - 13:50
    $egitimsaat = explode("-", $egitimsaat); //13:00,13:50

    $_egitimsaat = str_replace(" ", "", $_egitimsaat); //13:00 - 13:50
    $_egitimsaat = explode("-", $_egitimsaat); //13:00,13:50


    $date = $egitimsaat[0] . ":00";

    $date2 = $_egitimsaat[0] . ":00";

    $egitimsaat1 = date('H:i:s', strtotime($date));
    $egitimsaat2 = date('H:i:s', strtotime($date));

    $egitimsaat_baslangic = date('H:i:s', strtotime($date2));
    $egitimsaat_bitis = date('H:i:s', strtotime($date2));

    $htmlf->find(".baslik", 0)->innertext = $baslik;
    if ($this->tbMebbisId == 1337 || $this->tbMebbisId == 1338) {
      $htmlf->find(".kursiyer", 0)->innertext = $kursiyer . " " . $tckimlikno;
    } else {
      $htmlf->find(".kursiyer", 0)->innertext = $kursiyer;
    }
    $htmlf->find(".egitmen", 0)->innertext = $egitmen;
    //$this->companyName= iconv("ISO-8859-9", "UTF-8",$this->companyName);
    $htmlf->find(".sirketismi", 0)->innertext = $this->companyName;


    if ($tekli) {
      $htmlf->find(".egitimsuresi", 0)->innertext = $egitimtarih . " " . $saataralik; //15.02.2022 08:00 - 16.02.2022 09:00    
    } else {
      $htmlf->find(".egitimsuresi", 0)->innertext = $egitimtarih . " " . $saataralik . " <br> " . $egitimtarih2 . " " . $saataralik2; //15.02.2022 08:00 - 16.02.2022 09:00    
    }
    $puan = 100;
    foreach ($htmlf->find(".adet") as $adet) {
      $r = rand(0, 100);
      if ($r > 85 && $puan > 80) {
        $adet->innertext = "1";
        $puan -= 4;
      } else {
        $adet->innertext = "0";
      }
    }

    $htmlf->find(".puan", 0)->innertext = $puan;

    $havadurumlari = array(
      "Sisli Hava",
      "Yağmurlu Hava",
      "Güneşli Hava"
    );
    $havadurumu = array_rand($havadurumlari);
    $htmlf->find(".havadurumu", 0)->innertext = $havadurumlari[$havadurumu];
    $htmlf->find(".donem", 0)->innertext = $tarih;
    $htmlf->find(".tarih", 0)->innertext = $egitimtarih;

    $path = $this->userpath . "pdf/egitim_kayitlari/" . $this->seo($tarih) . "/" . $this->seo($kursiyer) . "/";
    return $this->savepdf($htmlf, $path, $this->seo($baslik) . ".pdf");
  }

  function savepdf($htmlf, $path, $pdfname, $checkexists = true)
  {
    $this->path = $path;
    if (file_exists($this->path . $pdfname) && $checkexists) {
      echo $path . $pdfname . " exists\n";
      return pdfCreateStatuses::$exists;
    }
    $dompdf = new Dompdf();
    $dompdf->loadHtml($htmlf);
    $dompdf->setPaper('A4', 'portrait');

    // Render the HTML as PDF
    $dompdf->render();



    $this->curl->createPath($path);
    file_put_contents($path . $pdfname, $dompdf->output());
    $path = str_replace(FCPATH, base_url(), $path);
    echo $path . $pdfname . "\n";
    return pdfCreateStatuses::$success;
  }

  function seo($text)
  {
    $find = array('Ç', 'Ş', 'Ğ', 'Ü', 'İ', 'Ö', 'ç', 'ş', 'ğ', 'ü', 'ö', 'ı', '+', '#');
    $replace = array('c', 's', 'g', 'u', 'i', 'o', 'c', 's', 'g', 'u', 'o', 'i', 'plus', 'sharp');
    $text = strtolower(str_replace($find, $replace, $text));
    $text = preg_replace("@[^A-Za-z0-9\-_\.\+]@i", ' ', $text);
    $text = trim(preg_replace('/\s+/', ' ', $text));
    $text = str_replace(' ', '-', $text);
    return $text;
  }

  function userfolderzip()
  {
    $zippath = $this->userpath . "tbMebbis" . $this->tbMebbisId . "-" . $this->seo(date("Y-m-d_H-i-s")) . '.zip';
    if (file_exists($zippath))
      @unlink($zippath);
    $rootPath = realpath($this->userpath);

    // Initialize archive object
    $zip = new ZipArchive();
    $zip->open($zippath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

    // Create recursive directory iterator
    /** @var SplFileInfo[] $files */
    $files = new RecursiveIteratorIterator(
      new RecursiveDirectoryIterator($rootPath),
      RecursiveIteratorIterator::LEAVES_ONLY
    );

    foreach ($files as $name => $file) {
      // Skip directories (they would be added automatically)
      if (!$file->isDir() && ($file->getExtension() != "txt") && ($file->getExtension() != "zip") && ($file->getExtension() != "html")) {
        // Get real and relative path for current file
        $filePath = $file->getRealPath();
        $relativePath = substr($filePath, strlen($rootPath) + 1);

        // Add current file to archive
        $zip->addFile($filePath, $relativePath);
      }
    }

    // Zip archive will be created only after closing object
    $zip->close();
    return $zippath;
  }

  public function permalink($str, $options = array())
  {
    $str = mb_convert_encoding((string) $str, 'UTF-8', mb_list_encodings());
    $defaults = array(
      'delimiter' => '-',
      'limit' => null,
      'lowercase' => true,
      'replacements' => array(),
      'transliterate' => true
    );
    $options = array_merge($defaults, $options);
    $char_map = array(
      // Latin
      'À' => 'A',
      'Á' => 'A',
      'Â' => 'A',
      'Ã' => 'A',
      'Ä' => 'A',
      'Å' => 'A',
      'Æ' => 'AE',
      'Ç' => 'C',
      'È' => 'E',
      'É' => 'E',
      'Ê' => 'E',
      'Ë' => 'E',
      'Ì' => 'I',
      'Í' => 'I',
      'Î' => 'I',
      'Ï' => 'I',
      'Ð' => 'D',
      'Ñ' => 'N',
      'Ò' => 'O',
      'Ó' => 'O',
      'Ô' => 'O',
      'Õ' => 'O',
      'Ö' => 'O',
      'Ő' => 'O',
      'Ø' => 'O',
      'Ù' => 'U',
      'Ú' => 'U',
      'Û' => 'U',
      'Ü' => 'U',
      'Ű' => 'U',
      'Ý' => 'Y',
      'Þ' => 'TH',
      'ß' => 'ss',
      'à' => 'a',
      'á' => 'a',
      'â' => 'a',
      'ã' => 'a',
      'ä' => 'a',
      'å' => 'a',
      'æ' => 'ae',
      'ç' => 'c',
      'è' => 'e',
      'é' => 'e',
      'ê' => 'e',
      'ë' => 'e',
      'ì' => 'i',
      'í' => 'i',
      'î' => 'i',
      'ï' => 'i',
      'ð' => 'd',
      'ñ' => 'n',
      'ò' => 'o',
      'ó' => 'o',
      'ô' => 'o',
      'õ' => 'o',
      'ö' => 'o',
      'ő' => 'o',
      'ø' => 'o',
      'ù' => 'u',
      'ú' => 'u',
      'û' => 'u',
      'ü' => 'u',
      'ű' => 'u',
      'ý' => 'y',
      'þ' => 'th',
      'ÿ' => 'y',
      // Latin symbols
      '©' => '(c)',
      // Greek
      'Α' => 'A',
      'Β' => 'B',
      'Γ' => 'G',
      'Δ' => 'D',
      'Ε' => 'E',
      'Ζ' => 'Z',
      'Η' => 'H',
      'Θ' => '8',
      'Ι' => 'I',
      'Κ' => 'K',
      'Λ' => 'L',
      'Μ' => 'M',
      'Ν' => 'N',
      'Ξ' => '3',
      'Ο' => 'O',
      'Π' => 'P',
      'Ρ' => 'R',
      'Σ' => 'S',
      'Τ' => 'T',
      'Υ' => 'Y',
      'Φ' => 'F',
      'Χ' => 'X',
      'Ψ' => 'PS',
      'Ω' => 'W',
      'Ά' => 'A',
      'Έ' => 'E',
      'Ί' => 'I',
      'Ό' => 'O',
      'Ύ' => 'Y',
      'Ή' => 'H',
      'Ώ' => 'W',
      'Ϊ' => 'I',
      'Ϋ' => 'Y',
      'α' => 'a',
      'β' => 'b',
      'γ' => 'g',
      'δ' => 'd',
      'ε' => 'e',
      'ζ' => 'z',
      'η' => 'h',
      'θ' => '8',
      'ι' => 'i',
      'κ' => 'k',
      'λ' => 'l',
      'μ' => 'm',
      'ν' => 'n',
      'ξ' => '3',
      'ο' => 'o',
      'π' => 'p',
      'ρ' => 'r',
      'σ' => 's',
      'τ' => 't',
      'υ' => 'y',
      'φ' => 'f',
      'χ' => 'x',
      'ψ' => 'ps',
      'ω' => 'w',
      'ά' => 'a',
      'έ' => 'e',
      'ί' => 'i',
      'ό' => 'o',
      'ύ' => 'y',
      'ή' => 'h',
      'ώ' => 'w',
      'ς' => 's',
      'ϊ' => 'i',
      'ΰ' => 'y',
      'ϋ' => 'y',
      'ΐ' => 'i',
      // Turkish
      'Ş' => 'S',
      'İ' => 'I',
      'Ç' => 'C',
      'Ü' => 'U',
      'Ö' => 'O',
      'Ğ' => 'G',
      'ş' => 's',
      'ı' => 'i',
      'ç' => 'c',
      'ü' => 'u',
      'ö' => 'o',
      'ğ' => 'g',
      // Russian
      'А' => 'A',
      'Б' => 'B',
      'В' => 'V',
      'Г' => 'G',
      'Д' => 'D',
      'Е' => 'E',
      'Ё' => 'Yo',
      'Ж' => 'Zh',
      'З' => 'Z',
      'И' => 'I',
      'Й' => 'J',
      'К' => 'K',
      'Л' => 'L',
      'М' => 'M',
      'Н' => 'N',
      'О' => 'O',
      'П' => 'P',
      'Р' => 'R',
      'С' => 'S',
      'Т' => 'T',
      'У' => 'U',
      'Ф' => 'F',
      'Х' => 'H',
      'Ц' => 'C',
      'Ч' => 'Ch',
      'Ш' => 'Sh',
      'Щ' => 'Sh',
      'Ъ' => '',
      'Ы' => 'Y',
      'Ь' => '',
      'Э' => 'E',
      'Ю' => 'Yu',
      'Я' => 'Ya',
      'а' => 'a',
      'б' => 'b',
      'в' => 'v',
      'г' => 'g',
      'д' => 'd',
      'е' => 'e',
      'ё' => 'yo',
      'ж' => 'zh',
      'з' => 'z',
      'и' => 'i',
      'й' => 'j',
      'к' => 'k',
      'л' => 'l',
      'м' => 'm',
      'н' => 'n',
      'о' => 'o',
      'п' => 'p',
      'р' => 'r',
      'с' => 's',
      'т' => 't',
      'у' => 'u',
      'ф' => 'f',
      'х' => 'h',
      'ц' => 'c',
      'ч' => 'ch',
      'ш' => 'sh',
      'щ' => 'sh',
      'ъ' => '',
      'ы' => 'y',
      'ь' => '',
      'э' => 'e',
      'ю' => 'yu',
      'я' => 'ya',
      // Ukrainian
      'Є' => 'Ye',
      'І' => 'I',
      'Ї' => 'Yi',
      'Ґ' => 'G',
      'є' => 'ye',
      'і' => 'i',
      'ї' => 'yi',
      'ґ' => 'g',
      // Czech
      'Č' => 'C',
      'Ď' => 'D',
      'Ě' => 'E',
      'Ň' => 'N',
      'Ř' => 'R',
      'Š' => 'S',
      'Ť' => 'T',
      'Ů' => 'U',
      'Ž' => 'Z',
      'č' => 'c',
      'ď' => 'd',
      'ě' => 'e',
      'ň' => 'n',
      'ř' => 'r',
      'š' => 's',
      'ť' => 't',
      'ů' => 'u',
      'ž' => 'z',
      // Polish
      'Ą' => 'A',
      'Ć' => 'C',
      'Ę' => 'e',
      'Ł' => 'L',
      'Ń' => 'N',
      'Ó' => 'o',
      'Ś' => 'S',
      'Ź' => 'Z',
      'Ż' => 'Z',
      'ą' => 'a',
      'ć' => 'c',
      'ę' => 'e',
      'ł' => 'l',
      'ń' => 'n',
      'ó' => 'o',
      'ś' => 's',
      'ź' => 'z',
      'ż' => 'z',
      // Latvian
      'Ā' => 'A',
      'Č' => 'C',
      'Ē' => 'E',
      'Ģ' => 'G',
      'Ī' => 'i',
      'Ķ' => 'k',
      'Ļ' => 'L',
      'Ņ' => 'N',
      'Š' => 'S',
      'Ū' => 'u',
      'Ž' => 'Z',
      'ā' => 'a',
      'č' => 'c',
      'ē' => 'e',
      'ģ' => 'g',
      'ī' => 'i',
      'ķ' => 'k',
      'ļ' => 'l',
      'ņ' => 'n',
      'š' => 's',
      'ū' => 'u',
      'ž' => 'z'
    );
    $str = preg_replace(array_keys($options['replacements']), $options['replacements'], $str);
    if ($options['transliterate']) {
      $str = str_replace(array_keys($char_map), $char_map, $str);
    }
    $str = preg_replace('/[^\p{L}\p{Nd}]+/u', $options['delimiter'], $str);
    $str = preg_replace('/(' . preg_quote($options['delimiter'], '/') . '){2,}/', '$1', $str);
    $str = mb_substr($str, 0, ($options['limit'] ? $options['limit'] : mb_strlen($str, 'UTF-8')), 'UTF-8');
    $str = trim($str, $options['delimiter']);
    return $options['lowercase'] ? mb_strtolower($str, 'UTF-8') : $str;
  }


  function dosyalarim()
  {

    $this->curl->createPath($this->userpath);
    $rootPath = realpath($this->userpath);

    $dosyalar = scandir($rootPath);
    //$dosyalar = glob("*.txt");
    $dosyazip = [];
    foreach ($dosyalar as $dosya) {
      $ss = substr_compare($dosya, ".zip", -strlen(".zip")) === 0;
      if ($ss == 1 || $ss == "1") {
        $dd = $rootPath . "/" . $dosya;
        $dd = str_replace(FCPATH . "", "", $dd);
        array_push($dosyazip, ['yol' => $dd, 'dosyaAdi' => $dosya]);
      }
    }
    return $dosyazip;
  }
}
