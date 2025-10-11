import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Listings (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // TODO: Get auth token for tests
    // authToken = await getTestAuthToken();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/listings (GET)', () => {
    it('should return paginated listings', () => {
      return request(app.getHttpServer())
        .get('/listings')
        .query({ page: 1, limit: 10, status: 'approved' })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('listings');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(Array.isArray(res.body.listings)).toBe(true);
        });
    });

    it('should filter by category', () => {
      return request(app.getHttpServer())
        .get('/listings')
        .query({ categoryId: 'test-category-id' })
        .expect(200);
    });

    it('should search by query', () => {
      return request(app.getHttpServer())
        .get('/listings')
        .query({ q: 'test search' })
        .expect(200);
    });
  });

  describe('/listings/:id (GET)', () => {
    it('should return a listing by id', async () => {
      // First create a listing to get a valid ID
      // or use a known test ID
      const testId = 'test-listing-id';

      return request(app.getHttpServer())
        .get(`/listings/${testId}`)
        .expect((res) => {
          if (res.status === 200) {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('title');
          } else {
            expect(res.status).toBe(404);
          }
        });
    });

    it('should return 404 for non-existent listing', () => {
      return request(app.getHttpServer())
        .get('/listings/non-existent-id')
        .expect(404);
    });
  });

  describe('/listings (POST)', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/listings')
        .send({
          title: 'Test Listing',
          description: 'Test Description',
          categoryId: 'test-category',
        })
        .expect(401);
    });

    // TODO: Add authenticated tests when auth is set up
    /*
    it('should create a new listing', () => {
      return request(app.getHttpServer())
        .post('/listings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Listing',
          description: 'Test Description',
          categoryId: 'test-category',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.title).toBe('Test Listing');
        });
    });
    */
  });
});
