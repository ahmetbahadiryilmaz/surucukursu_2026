<?php

namespace SurucuKursu\Tasks;

require_once __DIR__ . '/../Lib/simple_html_dom.php';

/**
 * Ek4Task - Generates EK-4 (Sınav Sonuç Raporu) PDFs
 * 
 * This task handles the generation of exam result report forms.
 */
class Ek4Task extends BaseTask {
    
    public function __construct($drivingSchoolId, $companyName = '') {
        parent::__construct($drivingSchoolId, $companyName);
    }
    
    /**
     * Generate EK-4 PDF
     * 
     * @param array $data Contains:
     *   - studentName: Student full name
     *   - plateNumber: Vehicle plate number
     *   - instructorName: Instructor name
     *   - examDate: Exam date
     *   - period: Education period
     * @return array Result with status and path
     */
    public function generate($data) {
        $templateFile = $this->templatePath . '/ek4/ek4.html';
        
        if (!file_exists($templateFile)) {
            throw new \Exception("EK-4 template not found: {$templateFile}");
        }
        
        $html = new \simple_html_dom();
        $html->load_file($templateFile);
        
        $studentName = $data['studentName'] ?? '';
        $plateNumber = $data['plateNumber'] ?? '';
        $instructorName = $data['instructorName'] ?? '';
        $examDate = $data['examDate'] ?? '';
        $period = $data['period'] ?? '';
        
        // Randomize separator visibility
        $this->randomizeSeparators($html);
        
        // Fill data
        $kursiyerEl = $html->find('.kursiyer', 0);
        if ($kursiyerEl) $kursiyerEl->innertext = $studentName;
        
        $plakaEl = $html->find('.plakano', 0);
        if ($plakaEl) $plakaEl->innertext = $plateNumber;
        
        $egitmenEl = $html->find('.egitmen', 0);
        if ($egitmenEl) $egitmenEl->innertext = $instructorName;
        
        $companyEl = $html->find('.companyName', 0);
        if ($companyEl) $companyEl->innertext = strtoupper($this->companyName);
        
        $tarihEl = $html->find('.tarih', 0);
        if ($tarihEl) $tarihEl->innertext = $examDate;
        
        $resultHtml = $html->save();
        $html->clear();
        
        $studentNameSeo = $this->seo($studentName);
        $periodSeo = $this->seo($period);
        
        $subFolder = "sinav-sonuc-raporu/{$periodSeo}";
        $filename = "{$studentNameSeo}_ek4.pdf";
        
        return $this->savePdf($resultHtml, $subFolder, $filename);
    }
    
    /**
     * Randomize separator visibility for visual variation
     */
    private function randomizeSeparators($html) {
        // Hide all separators first
        $separators = $html->find('.sep');
        foreach ($separators as $sep) {
            $sep->class = $sep->class . ' hidden';
        }
        
        // Separator groups
        $groups = [
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['10', '11', '12', '13']
        ];
        
        // Randomly select one group to show
        $selectedGroup = $groups[array_rand($groups)];
        
        foreach ($selectedGroup as $num) {
            $sepEl = $html->find('.sep' . $num, 0);
            if ($sepEl) {
                $sepEl->class = 'sep sep' . $num;
            }
        }
    }
}
