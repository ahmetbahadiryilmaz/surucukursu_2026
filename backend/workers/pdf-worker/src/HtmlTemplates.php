<?php

namespace SurucuKursu;

class HtmlTemplates {
    
    /**
     * Generate HTML content for a single certificate
     */
    public static function generateCertificateHtml($data) {
        $studentId = $data['studentId'] ?? 'Unknown';
        $studentName = $data['studentName'] ?? 'Ali Veli';
        $drivingSchoolCode = $data['drivingSchoolCode'] ?? $data['drivingSchoolId'] ?? 'DEFAULT';
        $template = $data['template'] ?? 'default';
        $certificateType = $data['certificateType'] ?? 'Surucu Kursu Bitirme Belgesi';
        $issueDate = date('d.m.Y H:i');
        $timestamp = date('d/m/Y H:i:s');
        $courseType = $data['courseType'] ?? 'B Sinifi Surucu Egitimi';
        $duration = $data['duration'] ?? '72 Saat';
        $grade = $data['grade'] ?? 'Basarili';
        
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Surucu Kursu Belgesi</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 40px; padding: 0;">
    <div style="border: 8px solid #000; padding: 30px; margin: 0 auto; max-width: 700px;">
        <div style="text-align: center; border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="color: #000; font-size: 36px; margin: 10px 0;">SERTIFIKA</h1>
            <div style="color: #333; font-size: 18px; margin-top: 10px;">{$certificateType}</div>
        </div>
        
        <div style="margin: 25px 0; line-height: 1.6;">
            <p style="font-size: 14px; color: #000; margin-bottom: 15px; text-align: center;">
                T.C. Milli Egitim Bakanligi onayli surucu kursu tarafindan
            </p>
            
            <div style="font-size: 28px; color: #000; font-weight: bold; margin: 20px 0; padding: 15px; border: 2px solid #000; text-align: center;">
                {$studentName}
            </div>
            
            <p style="font-size: 14px; color: #000; margin: 15px 0; text-align: center;">
                adli kursiyerin asagida belirtilen egitimi basariyla tamamladigi belgedir.
            </p>
            
            <div style="text-align: center; margin: 20px 0;">
                <span style="display: inline-block; padding: 8px 20px; background: #000; color: white; font-size: 16px; font-weight: bold;">
                    {$grade}
                </span>
            </div>
            
            <div style="background: #f0f0f0; padding: 20px; margin: 20px 0; border: 1px solid #ccc;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 8px 0; font-weight: bold; color: #000; font-size: 13px; width: 200px;">
                            Kursiyer Numarasi:
                        </td>
                        <td style="padding: 8px 0; color: #333; font-size: 13px;">
                            {$studentId}
                        </td>
                    </tr>
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 8px 0; font-weight: bold; color: #000; font-size: 13px;">
                            Egitim Turu:
                        </td>
                        <td style="padding: 8px 0; color: #333; font-size: 13px;">
                            {$courseType}
                        </td>
                    </tr>
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 8px 0; font-weight: bold; color: #000; font-size: 13px;">
                            Egitim Suresi:
                        </td>
                        <td style="padding: 8px 0; color: #333; font-size: 13px;">
                            {$duration}
                        </td>
                    </tr>
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 8px 0; font-weight: bold; color: #000; font-size: 13px;">
                            Surucu Kursu Kodu:
                        </td>
                        <td style="padding: 8px 0; color: #333; font-size: 13px;">
                            DS{$drivingSchoolCode}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #000; font-size: 13px;">
                            Sablon:
                        </td>
                        <td style="padding: 8px 0; color: #333; font-size: 13px;">
                            {$template}
                        </td>
                    </tr>
                </table>
            </div>
        </div>
        
        <div style="margin-top: 50px; border-top: 2px solid #000; padding-top: 30px;">
            <table style="width: 100%;">
                <tr>
                    <td style="width: 50%; text-align: center; vertical-align: top;">
                        <div style="border-top: 2px solid #000; margin-top: 40px; padding-top: 10px; font-size: 12px; color: #333;">
                            Mudur Imzasi
                        </div>
                    </td>
                    <td style="width: 50%; text-align: center; vertical-align: top;">
                        <div style="border-top: 2px solid #000; margin-top: 40px; padding-top: 10px; font-size: 12px; color: #333;">
                            Egitmen Imzasi
                        </div>
                    </td>
                </tr>
            </table>
        </div>
        
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; text-align: center; font-size: 11px; color: #666;">
            <div>
                <strong>Duzenlenme Tarihi:</strong> {$issueDate}
            </div>
            <div style="margin-top: 5px;">
                Belge No: CERT-DS{$drivingSchoolCode}-{$studentId}-{$timestamp}
            </div>
        </div>
    </div>
</body>
</html>
HTML;
    }
    
    /**
     * Generate HTML content for a group certificate
     */
    public static function generateGroupCertificateHtml($pdfContents) {
        $timestamp = date('d/m/Y H:i:s');
        $count = count($pdfContents);
        $issueDate = date('d.m.Y H:i');
        
        return <<<HTML
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Grup Sertifikası</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 40px;
            padding: 0;
        }
        .certificate {
            border: 10px solid #333;
            padding: 40px;
            text-align: center;
        }
        h1 {
            color: #000;
            font-size: 36px;
            margin: 0;
        }
        .subtitle {
            color: #333;
            font-size: 20px;
            margin: 20px 0;
        }
        .info {
            font-size: 16px;
            margin: 30px 0;
            line-height: 2;
        }
        .info strong {
            color: #000;
        }
    </style>
</head>
<body>
    <div class="certificate">
        <h1>GRUP SERTİFİKASI</h1>
        <div class="subtitle">Birleştirilmiş Sertifikalar Paketi</div>
        <div class="info">
            <p><strong>Toplam Sertifika:</strong> {$count}</p>
            <p><strong>Oluşturulma Tarihi:</strong> {$issueDate}</p>
            <p><strong>Referans No:</strong> GRP-{$timestamp}</p>
        </div>
    </div>
</body>
</html>
HTML;
    }
}
