<?php

namespace SurucuKursu\Tasks;

require_once __DIR__ . '/../Lib/simple_html_dom.php';

/**
 * SimulationTask - Generates Simulation Report PDFs
 * 
 * This task handles the generation of simulator training reports.
 * It DOES depend on simulator settings (sesim or anagrup).
 * 
 * Simulator Types:
 * - sesim: Single report format with timing chart
 * - anagrup: Multiple reports for each simulation scenario
 */
class SimulationTask extends BaseTask {
    
    const SIMULATOR_SESIM = 'sesim';
    const SIMULATOR_ANAGRUP = 'anagrup';
    
    /**
     * All simulation scenarios for anagrup type
     */
    private static $anagrupScenarios = [
        "ALGI VE REFLEKS SİMÜLASYONU",
        "DEĞİŞİK HAVA KOŞULLARI SİMÜLASYONU",
        "DİREKSİYON EĞİTİM ALANI SİMÜLASYONU",
        "GECE, GÜNDÜZ SİSLİ HAVA SİMÜLASYONU",
        "İNİŞ ÇIKIŞ EĞİMLİ YOL SİMÜLASYONU",
        "PARK EĞİTİMİ SİMÜLASYONU",
        "ŞEHİR İÇİ YOL SİMÜLASYONU",
        "ŞEHİRLER ARASI YOL SİMÜLASYONU",
        "TRAFİK İŞARETLERİ SİMÜLASYONU",
        "TRAFİK ORTAMI SİMÜLASYONU",
        "VİRAJLI YOLDA SÜRÜŞ SİMÜLASYONU",
    ];
    
    private $simulatorType;
    
    public function __construct($drivingSchoolId, $companyName = '', $simulatorType = self::SIMULATOR_SESIM) {
        parent::__construct($drivingSchoolId, $companyName);
        $this->simulatorType = $simulatorType;
    }
    
    /**
     * Set simulator type
     */
    public function setSimulatorType($type) {
        if (!in_array($type, [self::SIMULATOR_SESIM, self::SIMULATOR_ANAGRUP])) {
            throw new \Exception("Invalid simulator type: {$type}. Use 'sesim' or 'anagrup'");
        }
        $this->simulatorType = $type;
    }
    
    /**
     * Generate Simulation Report PDF(s)
     * 
     * @param array $data Contains:
     *   - studentInfo: array with tc-kimlik-no, ad-soyad
     *   - simulatorRecords: array of simulator lesson records
     *   - period: Education period (dönem)
     *   - simulatorType: 'sesim' or 'anagrup' (optional, uses instance default)
     * @return array Result with status and generated files
     */
    public function generate($data) {
        // Support both old format (studentInfo object) and new format (flat data)
        $studentInfo = $data['studentInfo'] ?? [];
        
        // If studentInfo is empty, try to build it from flat data
        if (empty($studentInfo)) {
            $nestedData = $data['data'] ?? [];
            $studentInfo = [
                'ad-soyad' => $nestedData['studentName'] ?? $data['studentName'] ?? 'Bilinmeyen',
                'tc-kimlik-no' => $nestedData['tcNumber'] ?? $data['tcNumber'] ?? $data['studentId'] ?? 'unknown',
            ];
        }
        
        echo "SimulationTask: Student Info = " . json_encode($studentInfo) . "\n";
        
        $simulatorRecords = $data['simulatorRecords'] ?? [];
        $period = $data['period'] ?? date('Y');
        $simulatorType = $data['simulatorType'] ?? $this->simulatorType;
        
        $this->simulatorType = $simulatorType;
        
        // If no simulator records, create dummy data for testing
        if (empty($simulatorRecords)) {
            echo "SimulationTask: No simulator records, creating test data\n";
            $simulatorRecords = $this->createTestSimulatorRecords();
        }
        
        // Sort records by date and time (newest first)
        usort($simulatorRecords, function($a, $b) {
            $dateA = strtotime(str_replace('/', '-', $a['ders_tarihi'] ?? $a[6] ?? ''));
            $dateB = strtotime(str_replace('/', '-', $b['ders_tarihi'] ?? $b[6] ?? ''));
            $timeA = strtotime($a['ders_saati'] ?? $a[7] ?? '');
            $timeB = strtotime($b['ders_saati'] ?? $b[7] ?? '');
            
            if ($dateA == $dateB) {
                return $timeA < $timeB ? 1 : -1;
            }
            return $dateA < $dateB ? 1 : -1;
        });
        
        $results = [];
        
        if ($this->simulatorType === self::SIMULATOR_SESIM) {
            $results[] = $this->generateSesimReport($studentInfo, $simulatorRecords, $period);
        } else {
            $results = $this->generateAnagrupReports($studentInfo, $simulatorRecords, $period);
        }
        
        return [
            'status' => 'success',
            'simulatorType' => $this->simulatorType,
            'files' => $results
        ];
    }
    
    /**
     * Create test simulator records for development/testing
     */
    private function createTestSimulatorRecords() {
        $today = date('d/m/Y');
        return [
            [
                'ders_tarihi' => $today,
                'ders_saati' => '09:00',
                'dersi_veren_personel' => 'Test Eğitmen',
                'ders_yeri' => 'Simulatör',
            ],
            [
                'ders_tarihi' => $today,
                'ders_saati' => '10:00',
                'dersi_veren_personel' => 'Test Eğitmen',
                'ders_yeri' => 'Simulatör',
            ]
        ];
    }
    
    /**
     * Generate SESIM format report (single report with timing chart)
     */
    private function generateSesimReport($studentInfo, $simulatorRecords, $period) {
        $templateFile = $this->templatePath . '/sesim/sesim.html';
        
        if (!file_exists($templateFile)) {
            throw new \Exception("Sesim template not found: {$templateFile}");
        }
        
        $html = new \simple_html_dom();
        $html->load_file($templateFile);
        
        // Get the latest records (up to 2 for dual session)
        $latestRecords = array_slice($simulatorRecords, 0, 2);
        $record = $latestRecords[0];
        $record2 = count($latestRecords) > 1 ? $latestRecords[1] : null;
        
        $studentName = $studentInfo['ad-soyad'] ?? '';
        $instructorName = $record['dersi_veren_personel'] ?? $record[8] ?? '';
        $date1 = $record['ders_tarihi'] ?? $record[6] ?? '';
        $time1 = $record['ders_saati'] ?? $record[7] ?? '';
        
        // Fill student info
        $kursiyerEl = $html->find('.kursiyer', 0);
        if ($kursiyerEl) $kursiyerEl->innertext = $studentName;
        
        $egitmenEl = $html->find('.egitmen', 0);
        if ($egitmenEl) $egitmenEl->innertext = $instructorName;
        
        // Calculate training duration string
        $durationStr = $this->buildDurationString($record, $record2);
        
        $suresiEl = $html->find('.egitimsuresi', 0);
        if ($suresiEl) $suresiEl->innertext = $durationStr;
        
        // Generate timing chart
        $chartHtml = $this->generateTimingChart($record, $record2);
        
        $cizelgeEl = $html->find('.cizelgetr', 0);
        if ($cizelgeEl) $cizelgeEl->innertext = $chartHtml;
        
        $resultHtml = $html->save();
        $html->clear();
        
        $studentNameSeo = $this->seo($studentName);
        $timestamp = date('Y-m-d_H-i-s');
        
        echo "Saving SESIM PDF for: {$studentName}\n";
        
        return $this->savePdf($resultHtml, '', "simulasyon_{$studentNameSeo}_sesim_{$timestamp}.pdf");
    }
    
    /**
     * Generate ANAGRUP format reports (one report per scenario)
     */
    private function generateAnagrupReports($studentInfo, $simulatorRecords, $period) {
        $results = [];
        
        // Get the latest records (up to 2 for dual session)
        $latestRecords = array_slice($simulatorRecords, 0, 2);
        $record = $latestRecords[0];
        $record2 = count($latestRecords) > 1 ? $latestRecords[1] : null;
        $isSingleSession = ($record2 === null);
        
        $studentName = $studentInfo['ad-soyad'] ?? '';
        $tcNo = $studentInfo['tc-kimlik-no'] ?? '';
        $studentNameSeo = $this->seo($studentName);
        $periodSeo = $this->seo($period);
        
        // Generate report for each scenario
        foreach (self::$anagrupScenarios as $scenario) {
            $templateDir = $this->templatePath . '/anagrup/' . $scenario;
            $templateFile = $templateDir . '/anagrup.html';
            
            // If specific scenario template doesn't exist, use first available
            if (!file_exists($templateFile)) {
                // Try to find any anagrup.html in anagrup folder
                $firstScenario = self::$anagrupScenarios[0];
                $templateFile = $this->templatePath . '/anagrup/' . $firstScenario . '/anagrup.html';
            }
            
            if (!file_exists($templateFile)) {
                echo "Warning: Template not found for scenario: {$scenario}\n";
                continue;
            }
            
            $html = new \simple_html_dom();
            $html->load_file($templateFile);
            
            $instructorName = $record['dersi_veren_personel'] ?? $record[8] ?? '';
            $date1 = $record['ders_tarihi'] ?? $record[6] ?? '';
            $time1 = $record['ders_saati'] ?? $record[7] ?? '';
            
            // Fill data - look for various class names that might be used
            $this->fillAnagrupTemplate($html, [
                'scenario' => $scenario,
                'studentName' => $studentName,
                'tcNo' => $tcNo,
                'instructorName' => $instructorName,
                'companyName' => $this->companyName,
                'period' => $period,
                'date1' => $date1,
                'time1' => $time1,
                'record2' => $record2,
                'isSingleSession' => $isSingleSession,
            ]);
            
            $resultHtml = $html->save();
            $html->clear();
            
            $scenarioSeo = $this->seo($scenario);
            $timestamp = date('Y-m-d_H-i-s');
            $filename = "simulasyon_{$studentNameSeo}_{$scenarioSeo}_{$timestamp}.pdf";
            
            echo "Saving ANAGRUP PDF: {$filename}\n";
            
            $results[] = $this->savePdf($resultHtml, '', $filename);
        }
        
        return $results;
    }
    
    /**
     * Fill anagrup template with data
     */
    private function fillAnagrupTemplate($html, $data) {
        // Title/Scenario
        $baslikEl = $html->find('.baslik', 0);
        if ($baslikEl) $baslikEl->innertext = $data['scenario'];
        
        // Student name (with or without TC)
        $kursiyerEl = $html->find('.kursiyer', 0);
        if ($kursiyerEl) {
            $kursiyerEl->innertext = $data['studentName'];
        }
        
        // Instructor
        $egitmenEl = $html->find('.egitmen', 0);
        if ($egitmenEl) $egitmenEl->innertext = $data['instructorName'];
        
        // Company name
        $companyEl = $html->find('.sirketismi', 0);
        if ($companyEl) $companyEl->innertext = strtoupper($data['companyName']);
        
        // Period
        $donemEl = $html->find('.donem', 0);
        if ($donemEl) $donemEl->innertext = $data['period'];
        
        // Date
        $tarihEl = $html->find('.tarih', 0);
        if ($tarihEl) $tarihEl->innertext = $data['date1'];
        
        // Training duration
        $suresiEl = $html->find('.egitimsuresi', 0);
        if ($suresiEl) {
            if ($data['isSingleSession']) {
                $suresiEl->innertext = $data['date1'] . ' ' . $data['time1'];
            } else {
                $record2 = $data['record2'];
                $date2 = $record2['ders_tarihi'] ?? $record2[6] ?? '';
                $time2 = $record2['ders_saati'] ?? $record2[7] ?? '';
                $suresiEl->innertext = $data['date1'] . ' ' . $data['time1'] . ' <br> ' . $date2 . ' ' . $time2;
            }
        }
        
        // Random scoring for evaluation criteria
        $this->fillRandomScores($html);
        
        // Weather condition
        $havaEl = $html->find('.havadurumu', 0);
        if ($havaEl) {
            $conditions = ['Sisli Hava', 'Yağmurlu Hava', 'Güneşli Hava'];
            $havaEl->innertext = $conditions[array_rand($conditions)];
        }
    }
    
    /**
     * Fill random scores for evaluation criteria
     */
    private function fillRandomScores($html) {
        $totalScore = 100;
        $adetElements = $html->find('.adet');
        
        foreach ($adetElements as $adetEl) {
            $r = rand(0, 100);
            if ($r > 85 && $totalScore > 80) {
                $adetEl->innertext = "1";
                $totalScore -= 4;
            } else {
                $adetEl->innertext = "0";
            }
        }
        
        $puanEl = $html->find('.puan', 0);
        if ($puanEl) $puanEl->innertext = $totalScore;
    }
    
    /**
     * Build duration string from records
     */
    private function buildDurationString($record, $record2 = null) {
        $date1 = $record['ders_tarihi'] ?? $record[6] ?? '';
        $time1 = $record['ders_saati'] ?? $record[7] ?? '';
        
        // Parse time to calculate end times
        $timeClean = str_replace(' ', '', $time1);
        $timeParts = explode('-', $timeClean);
        $startTime = $timeParts[0] ?? '08:00';
        
        $endTime1 = date('H:i', strtotime($startTime . ':00 +60 minutes'));
        $endTime2 = date('H:i', strtotime($startTime . ':00 +110 minutes'));
        
        if ($record2) {
            $date2 = $record2['ders_tarihi'] ?? $record2[6] ?? '';
            $time2 = $record2['ders_saati'] ?? $record2[7] ?? '';
            return "{$date1} {$time1} / {$date2} {$time2}";
        }
        
        return "{$date1} {$time1} / {$endTime1} - {$endTime2}";
    }
    
    /**
     * Generate timing chart for sesim report
     */
    private function generateTimingChart($record, $record2 = null) {
        $date1 = $record['ders_tarihi'] ?? $record[6] ?? '';
        $time1 = $record['ders_saati'] ?? $record[7] ?? '';
        
        // Parse start time
        $timeClean = str_replace(' ', '', $time1);
        $timeParts = explode('-', $timeClean);
        $startTime = ($timeParts[0] ?? '08:00') . ':00';
        
        $currentTime1 = strtotime($startTime);
        $currentTime2 = $record2 ? strtotime(str_replace(' ', '', explode('-', $record2['ders_saati'] ?? $record2[7] ?? '')[0] ?? '09:00') . ':00') : null;
        
        $date2 = $record2 ? ($record2['ders_tarihi'] ?? $record2[6] ?? '') : $date1;
        
        $chartHtml = '';
        
        for ($i = 0; $i < 16; $i++) {
            $duration = '00:06';
            $currentDate = $date1;
            
            // Switch to second session at row 8
            if ($i == 8 && $record2) {
                $currentTime1 = $currentTime2;
                $currentDate = $date2;
            } elseif ($i == 8) {
                $currentTime1 = strtotime(date('H:i:s', $currentTime1) . ' +18 minutes');
            }
            
            $rowStartTime = date('H:i:s', $currentTime1);
            
            // Last row of each session gets 8 minutes
            if ($i == 7 || $i == 15) {
                $rowEndTime = date('H:i:s', strtotime($rowStartTime . ' +8 minutes'));
                $duration = '00:08';
            } else {
                $rowEndTime = date('H:i:s', strtotime($rowStartTime . ' +6 minutes'));
            }
            
            $score = rand(80, 100);
            
            $chartHtml .= "
                <tr>
                    <td>" . ($i + 1) . "</td>
                    <td>{$currentDate}</td>
                    <td>{$rowStartTime}</td>
                    <td>{$rowEndTime}</td>
                    <td>{$duration}</td>
                    <td>" . ($i + 1) . "</td>
                    <td>{$score}</td>
                </tr>";
            
            // Advance time (skip at row 7 for session break)
            if ($i != 7) {
                $currentTime1 = strtotime(date('H:i:s', $currentTime1) . ' +6 minutes');
            }
        }
        
        return $chartHtml;
    }
}
