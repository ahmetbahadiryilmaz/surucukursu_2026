import { Injectable } from '@nestjs/common';
import { FastifyReply } from 'fastify';

/**
 * Service to handle the business logic for the mebbisYdIndex controller
 */


@Injectable()
export class mebbisYdIndexService {
  /**
   * Get view data for the index page
   * @returns The view data for rendering
   */
  getIndexViewData() {
    return {
      baseUrl: process.env.BASE_URL,
      message: 'Welcome to the homepage!'
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
      ...this.getIndexViewData(),
      ...data
    };
    return reply.view(template, viewData);
  }

  /**
   * Handle index page view (GET and POST)
   */
  handleIndexView(reply: FastifyReply) {
    return this.renderView(reply, 'index.hbs');
  }

  handleMainView(reply: FastifyReply) {
    return this.renderView(reply, 'index.hbs');
  }

  /**
   * Handle login form submission - redirect to redirect.aspx
   */
  handleLoginSubmission(reply: FastifyReply) {
    // In a real application, you would validate credentials here
    // For this mock server, we'll redirect to the local redirect.aspx page
    return reply.redirect(302, 'redirect.aspx');
  }

  /**
   * Handle redirect.aspx view
   */
  handleRedirectAspx(reply: FastifyReply) {
    return this.renderView(reply, 'redirect.aspx.hbs');
  }

  /**
   * Handle redirect.aspx POST - Handle verification code submission
   */
  handleRedirectAspxPost(reply: FastifyReply, body: any) {
    // Check if a 6-digit verification code was submitted
    const verificationCode = body?.txtCode || '';
    
    // Validate if it's a 6-digit number
    if (/^\d{6}$/.test(verificationCode)) {
      // Redirect to main page if valid 6-digit code
      return reply.redirect(302, 'main.aspx');
    }
    
    // If invalid code, stay on redirect page with error
    return this.renderView(reply, 'redirect.aspx.hbs', {
      error: 'Lütfen geçerli bir 6 haneli kod giriniz.',
      txtCode: verificationCode // Preserve entered value
    });
  }

  /**
   * Handle main page view after successful verification
   */
  handleMainPageView(reply: FastifyReply, query?: any) {
    const notificationToken = query?.ntk;
    return this.renderView(reply, 'main.aspx.hbs', {
      title: 'MEB Sürücü Kursu Sistemi',
      userName: 'Kullanıcı',
      currentDate: new Date().toLocaleDateString('tr-TR'),
      notificationToken: notificationToken || null
    });
  }

  /**
   * Handle default.aspx GET - Initial login page load
   */
  handleDefaultAspx(reply: FastifyReply, query?: any) {
    const noSession = query?.NoSession !== undefined;
    
    return this.renderView(reply, 'default.aspx.hbs', {
      title: 'MEBBİS Giriş',
      viewState: this.generateViewState(),
      eventValidation: this.generateEventValidation(),
      noSession: noSession,
      formAction: noSession ? 'default.aspx?NoSession' : 'default.aspx'
    });
  }

  /**
   * Handle default.aspx POST - Login credentials submission
   */
  handleDefaultAspxPost(reply: FastifyReply, body: any, query?: any) {
    const username = body?.txtKullaniciAd || '';
    const password = body?.txtSifre || '';
    const noSession = query?.NoSession !== undefined;
    
    // Simple validation - in real app, you'd validate against database
    if (username && password) {
      // Successful login - redirect to index.aspx or main.aspx
      if (noSession) {
        return reply.redirect(302, 'main.aspx');
      } else {
        return reply.redirect(302, 'index.aspx');
      }
    }
    
    // Failed login - stay on default.aspx with error
    return this.renderView(reply, 'default.aspx.hbs', {
      title: 'MEBBİS Giriş',
      viewState: this.generateViewState(),
      eventValidation: this.generateEventValidation(),
      noSession: noSession,
      formAction: noSession ? 'default.aspx?NoSession' : 'default.aspx',
      error: 'Kullanıcı adı veya şifre hatalı!',
      txtKullaniciAd: username
    });
  }

  /**
   * Handle index.aspx GET - Redirect page after successful login
   */
  handleIndexAspx(reply: FastifyReply) {
    // This typically redirects to main.aspx after successful login
    return reply.redirect(302, 'main.aspx');
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


}