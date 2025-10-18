import { Injectable } from '@nestjs/common';
import { FastifyReply } from 'fastify';

/**
 * Service to handle SKT (Sürücü Kursu Takip) related business logic
 */
@Injectable()
export class SktService {
  /**
   * Get base view data for SKT pages
   * @returns The view data for rendering
   */
  getBaseViewData() {
    return {
      baseUrl: process.env.BASE_URL,
      currentDate: new Date().toISOString(),
    };
  }

  /**
   * Render a view with the provided template and data
   * @param reply - The FastifyReply object
   * @param template - The template to render
   * @param data - The data to pass to the template
   * @returns The rendered view
   */
  renderView(reply: FastifyReply, template: string, data: object = {}) {
    const viewData = {
      ...this.getBaseViewData(),
      ...data
    };
    return reply.view(template, viewData);
  }

  /**
   * Handle skt00001.aspx view - Initial student registration
   */
  handleSkt00001(reply: FastifyReply) {
    return this.renderView(reply, 'SKT/SKT_skt00001.aspx.hbs', {
      pageTitle: 'Öğrenci Kayıt Formu',
      formAction: 'skt00001.aspx'
    });
  }

  /**
   * Handle skt00001.aspx POST - Validation code submission
   */
  handleSkt00001Post(reply: FastifyReply) {
    // In a real application, you would validate the 6-digit code here
    // For this mock server, we'll just redirect back to the same page
    return reply.redirect(302, '/SKT/skt00001.aspx');
  }

  /**
   * Handle skt02006.aspx GET - Student course selection
   */
  handleSkt02006Get(reply: FastifyReply) {
    return this.renderView(reply, 'skt02006.hbs', {
      pageTitle: 'Kurs Seçimi',
      formAction: 'skt02006.aspx',
      method: 'GET'
    });
  }

  /**
   * Handle skt02006.aspx POST - Student course selection submission
   */
  handleSkt02006Post(reply: FastifyReply) {
    return this.renderView(reply, 'skt02006_result.hbs', {
      pageTitle: 'Kurs Seçimi Sonucu',
      method: 'POST',
      success: true,
      message: 'Kurs seçiminiz başarıyla kaydedildi.'
    });
  }

  /**
   * Handle skt02009.aspx GET - Course progress tracking
   */
  handleSkt02009Get(reply: FastifyReply) {
    return this.renderView(reply, 'skt02009.hbs', {
      pageTitle: 'Kurs İlerleme Takibi',
      formAction: 'skt02009.aspx',
      method: 'GET'
    });
  }

  /**
   * Handle skt02009.aspx POST - Course progress submission
   */
  handleSkt02009Post(reply: FastifyReply) {
    return this.renderView(reply, 'skt02009_result.hbs', {
      pageTitle: 'İlerleme Kaydı',
      method: 'POST',
      progress: 75,
      message: 'İlerleme durumunuz güncellendi.'
    });
  }

  /**
   * Handle skt01001.aspx - Student information form
   */
  handleSkt01001(reply: FastifyReply) {
    return this.renderView(reply, 'skt01001.hbs', {
      pageTitle: 'Öğrenci Bilgi Formu',
      formAction: 'skt01001.aspx'
    });
  }

  /**
   * Handle skt04002.aspx GET - Training records retrieval page
   */
  handleSkt04002Get(reply: FastifyReply) {
    return this.renderView(reply, 'SKT/SKT_skt04002_aspx_GET.hbs', {
      pageTitle: 'Eğitim Kayıtları Listesi',
      formAction: 'skt04002.aspx',
      viewState: this.generateViewState(),
      eventValidation: this.generateEventValidation(),
      provinces: this.getProvinces(),
      periods: this.getPeriods()
    });
  }

  /**
   * Handle skt04002.aspx POST - Training records form submission
   */
  handleSkt04002Post(reply: FastifyReply, body: any) {
    const selectedProvince = body?.cmbIl || '';
    const selectedDistrict = body?.cmbIlce || '';
    const selectedInstitution = body?.cmbKurum || '';
    const selectedPeriod = body?.cmbDonemi || '';
    
    // Generate mock training records based on form submission
    const trainingRecords = this.generateMockTrainingRecords(selectedProvince, selectedPeriod);
    
    return this.renderView(reply, 'SKT/SKT_skt04002_aspx_POST.hbs', {
      pageTitle: 'Eğitim Kayıtları Sonuçları',
      records: trainingRecords,
      selectedProvince,
      selectedDistrict,
      selectedInstitution,
      selectedPeriod,
      recordCount: trainingRecords.length
    });
  }

  /**
   * Generate mock ViewState for ASP.NET forms
   */
  private generateViewState(): string {
    return '/wEPDwUKMTY3NDM4NTExOWQYAQUeX19Db250cm9sc1JlcXVpcmVQb3N0QmFja0tleV9fFgEFBWN0bDAx';
  }

  /**
   * Generate mock EventValidation for ASP.NET forms
   */
  private generateEventValidation(): string {
    return '/wEWAwKl1bKzCQLs0bLrBgKM54rGBgKbCgUJCwUJCwUJCwUJCwUJCwUJCwUJCwUJCwUJCwUJCwUJCwUJ';
  }

  /**
   * Get mock provinces data
   */
  private getProvinces() {
    return [
      { value: '01', text: 'Adana' },
      { value: '06', text: 'Ankara' },
      { value: '07', text: 'Antalya' },
      { value: '34', text: 'İstanbul' },
      { value: '35', text: 'İzmir' }
    ];
  }

  /**
   * Get mock periods data
   */
  private getPeriods() {
    return [
      { value: '2024-1', text: '2024-1. Dönem' },
      { value: '2024-2', text: '2024-2. Dönem' },
      { value: '2025-1', text: '2025-1. Dönem' }
    ];
  }

  /**
   * Generate mock training records
   */
  private generateMockTrainingRecords(province: string, period: string) {
    const records = [
      {
        studentName: 'Ahmet Yılmaz',
        tcNo: '12345678901',
        courseType: 'B Sınıfı Ehliyet Kursu',
        institution: 'Güven Sürücü Kursu',
        startDate: '2024-01-15',
        endDate: '2024-03-15',
        status: 'Tamamlandı'
      },
      {
        studentName: 'Ayşe Kaya',
        tcNo: '98765432109',
        courseType: 'B Sınıfı Ehliyet Kursu',
        institution: 'Başarı Sürücü Kursu',
        startDate: '2024-02-01',
        endDate: '2024-04-01',
        status: 'Devam Ediyor'
      }
    ];

    return records.map(record => ({
      ...record,
      province,
      period
    }));
  }

  /**
   * Generate mock exam results
   */
  private generateMockExamResults(examAnswers: any) {
    // Generate random exam results for simulation
    const totalQuestions = 50;
    const correctAnswers = Math.floor(Math.random() * 20) + 35; // Between 35-55 correct
    const score = Math.round((correctAnswers / totalQuestions) * 100);
    
    return {
      totalQuestions,
      correctAnswers,
      wrongAnswers: totalQuestions - correctAnswers,
      score,
      passed: score >= 70,
      examDate: new Date().toLocaleDateString('tr-TR'),
      examTime: new Date().toLocaleTimeString('tr-TR')
    };
  }
}
