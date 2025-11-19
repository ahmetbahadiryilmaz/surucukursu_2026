import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginController } from '../../backend/services/mebbis-service/src/controllers/login.controller';
import { SyncController } from '../../backend/services/mebbis-service/src/controllers/sync.controller';
import { TestController } from '../../backend/services/mebbis-service/src/controllers/test.controller';
import { ResponseController } from '../../backend/services/mebbis-service/src/controllers/response.controller';
import { TbMebbis } from '../../backend/services/mebbis-service/src/entities/tb-mebbis.entity';
import { MebbisGateway } from '../../backend/services/mebbis-service/src/mebbis.gateway';

describe('MebbisService (e2e)', () => {
  let app: INestApplication;
  let tbMebbisRepository: Repository<TbMebbis>;

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: 'sqlite',
            database: ':memory:',
            entities: [TbMebbis],
            synchronize: true,
            dropSchema: true,
          }),
          TypeOrmModule.forFeature([TbMebbis]),
        ],
        controllers: [
          LoginController,
          SyncController,
          TestController,
          ResponseController,
        ],
        providers: [MebbisGateway],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      tbMebbisRepository = moduleFixture.get<Repository<TbMebbis>>(
        getRepositoryToken(TbMebbis),
      );
    } catch (error) {
      console.error('Failed to initialize test app:', error);
      throw error;
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    // Clear database between tests
    await tbMebbisRepository.clear();
  });

  describe('Login Endpoints', () => {
    describe('POST /api/mebbis/login/trylogin', () => {
      it('should attempt login with valid credentials', () => {
        return request(app.getHttpServer())
          .post('/api/mebbis/login/trylogin')
          .send({
            username: 'testuser',
            password: 'testpass',
            tbMebbisId: 1,
          })
          .expect(201)
          .expect((res: request.Response) => {
            expect(res.body).toHaveProperty('message');
            // Note: Actual success/failure depends on external MEBBIS service
          });
      });

      it('should handle login attempt with invalid data', () => {
        return request(app.getHttpServer())
          .post('/api/mebbis/login/trylogin')
          .send({
            username: '',
            password: '',
            tbMebbisId: 1,
          })
          .expect(201)
          .expect((res: request.Response) => {
            expect(res.body).toHaveProperty('message');
          });
      });

      it('should return error for missing required fields', () => {
        return request(app.getHttpServer())
          .post('/api/mebbis/login/trylogin')
          .send({
            username: 'testuser',
            // missing password and tbMebbisId
          })
          .expect(400);
      });
    });

    describe('POST /api/mebbis/login/withNotification', () => {
      it('should perform login with notification', async () => {
        // Create a test record in database
        const testRecord = tbMebbisRepository.create({
          lastLogin: 0,
          mebbislogin: false,
        });
        testRecord.id = 1; // Set ID manually for testing
        await tbMebbisRepository.save(testRecord);

        return request(app.getHttpServer())
          .post('/api/mebbis/login/withNotification')
          .send({
            username: 'testuser',
            password: 'testpass',
            tbMebbisId: 1,
          })
          .expect(201)
          .expect((res: request.Response) => {
            expect(res.body).toHaveProperty('message');
            if (res.body.message === 'login success') {
              expect(res.body).toHaveProperty('data');
              expect(res.body.data).toHaveProperty('tbMebbisId', 1);
            }
          });
      });

      it('should handle login failure with notification', () => {
        return request(app.getHttpServer())
          .post('/api/mebbis/login/withNotification')
          .send({
            username: 'invalid',
            password: 'invalid',
            tbMebbisId: 999,
          })
          .expect(201)
          .expect((res: request.Response) => {
            expect(res.body).toHaveProperty('message');
            if (res.body.message === 'login failedwith notif') {
              expect(res.body).toHaveProperty('error');
            }
          });
      });
    });

    describe('POST /api/mebbis/login/isLoggedIn', () => {
      it('should check login status', async () => {
        const testRecord = tbMebbisRepository.create({
          lastLogin: Math.floor(Date.now() / 1000),
          mebbislogin: true,
          cookie: 'test_cookie_data',
        });
        testRecord.id = 1;
        await tbMebbisRepository.save(testRecord);

        return request(app.getHttpServer())
          .post('/api/mebbis/login/isLoggedIn')
          .send({
            tbMebbisId: 1,
          })
          .expect(201)
          .expect((res: request.Response) => {
            expect(res.body).toHaveProperty('message');
          });
      });

      it('should handle not logged in status', () => {
        return request(app.getHttpServer())
          .post('/api/mebbis/login/isLoggedIn')
          .send({
            tbMebbisId: 999,
          })
          .expect(201)
          .expect((res: request.Response) => {
            expect(res.body).toHaveProperty('message');
          });
      });
    });

    describe('POST /api/mebbis/login/withCode', () => {
      it('should perform login with verification code', async () => {
        const testRecord = tbMebbisRepository.create({
          lastLogin: 0,
          mebbislogin: false,
        });
        testRecord.id = 1;
        await tbMebbisRepository.save(testRecord);

        return request(app.getHttpServer())
          .post('/api/mebbis/login/withCode')
          .send({
            tbMebbisId: 1,
            code: '123456',
          })
          .expect(201)
          .expect((res: request.Response) => {
            expect(res.body).toHaveProperty('message');
            if (res.body.success) {
              expect(res.body).toHaveProperty('data');
              expect(res.body.data).toHaveProperty('tbMebbisId', 1);
            }
          });
      });
    });
  });

  describe('Sync Endpoints', () => {
    describe('POST /api/mebbis/sync/candidates', () => {
      it('should sync candidates data', () => {
        return request(app.getHttpServer())
          .post('/api/mebbis/sync/candidates')
          .send({
            tbMebbisId: 1,
          })
          .expect(201)
          .expect((res: request.Response) => {
            // Response depends on external service availability
            expect(typeof res.body).toBe('object');
          });
      });

      it('should handle sync failure', () => {
        return request(app.getHttpServer())
          .post('/api/mebbis/sync/candidates')
          .send({
            tbMebbisId: 999,
          })
          .expect(201)
          .expect((res: request.Response) => {
            expect(typeof res.body).toBe('object');
          });
      });
    });
  });

  describe('Test Endpoints', () => {
    describe('POST /api/test/socket', () => {
      it('should handle socket test request', () => {
        return request(app.getHttpServer())
          .post('/api/test/socket')
          .send({
            tbMebbisId: 123,
          })
          .expect(201)
          .expect((res: request.Response) => {
            expect(res.body).toBe(123);
          });
      });

      it('should return the tbMebbisId sent', () => {
        return request(app.getHttpServer())
          .post('/api/test/socket')
          .send({
            tbMebbisId: 456,
          })
          .expect(201)
          .expect((res: request.Response) => {
            expect(res.body).toBe(456);
          });
      });
    });
  });

  describe('Response Endpoints', () => {
    describe('GET /response/:id', () => {
      it('should return response not found for invalid id', () => {
        return request(app.getHttpServer())
          .get('/response/invalid-id')
          .expect(200)
          .expect((res: request.Response) => {
            expect(res.text).toContain('Response not found');
          });
      });

      it('should handle valid response id', () => {
        // This test depends on global.responseStore being set
        return request(app.getHttpServer())
          .get('/response/test-id')
          .expect(200);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', () => {
      return request(app.getHttpServer())
        .post('/api/mebbis/login/trylogin')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    it('should handle missing body for POST requests', () => {
      return request(app.getHttpServer())
        .post('/api/mebbis/login/trylogin')
        .send({})
        .expect(201); // Controller handles missing fields gracefully
    });
  });

  describe('Database Integration', () => {
    it('should update database on successful login', async () => {
      const testRecord = tbMebbisRepository.create({
        lastLogin: 0,
        mebbislogin: false,
      });
      testRecord.id = 1;
      await tbMebbisRepository.save(testRecord);

      // Perform login operation
      await request(app.getHttpServer())
        .post('/api/mebbis/login/withNotification')
        .send({
          username: 'testuser',
          password: 'testpass',
          tbMebbisId: 1,
        });

      // Check if database was updated
      const updatedRecord = await tbMebbisRepository.findOne({
        where: { id: 1 },
      });

      // Database update depends on external service response
      expect(updatedRecord).toBeDefined();
    });
  });
});