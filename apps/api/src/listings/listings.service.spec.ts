import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { PrismaService } from '@kavbot/database';
import { S3Service } from './s3.service';

describe('ListingsService', () => {
  let service: ListingsService;
  let prismaService: PrismaService;
  let s3Service: S3Service;

  const mockPrismaService = {
    listing: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
    tag: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    comment: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockS3Service = {
    generatePresignedUrl: jest.fn(),
    deleteObject: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListingsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
      ],
    }).compile();

    service = module.get<ListingsService>(ListingsService);
    prismaService = module.get<PrismaService>(PrismaService);
    s3Service = module.get<S3Service>(S3Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getListings', () => {
    it('should return paginated listings', async () => {
      const mockListings = [
        {
          id: '1',
          title: 'Test Listing',
          description: 'Test Description',
          status: 'approved',
          user: { id: 'user-1', firstName: 'John', tgUserId: 123n },
          category: { id: 'cat-1', name: 'Category' },
          photos: [],
          tags: [],
          _count: { comments: 0 },
          createdAt: new Date(),
          updatedAt: new Date(),
          publishedAt: new Date(),
          price: null,
          phone: null,
          email: null,
          location: null,
          categoryId: 'cat-1',
          userId: 'user-1',
          embedding: null,
        },
      ];

      mockPrismaService.listing.findMany.mockResolvedValue(mockListings);
      mockPrismaService.listing.count.mockResolvedValue(1);

      const result = await service.getListings({
        page: 1,
        limit: 10,
        status: 'approved',
      });

      expect(result.listings).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(mockPrismaService.listing.findMany).toHaveBeenCalled();
    });
  });

  describe('getListing', () => {
    it('should return a listing by id', async () => {
      const mockListing = {
        id: '1',
        title: 'Test Listing',
        description: 'Test',
        status: 'approved',
        user: { id: 'user-1', firstName: 'John', tgUserId: 123n },
        category: { id: 'cat-1', name: 'Category', slug: 'category' },
        photos: [],
        tags: [],
        comments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: new Date(),
        price: null,
        phone: null,
        email: null,
        location: null,
        categoryId: 'cat-1',
        userId: 'user-1',
        embedding: null,
      };

      mockPrismaService.listing.findUnique.mockResolvedValue(mockListing);

      const result = await service.getListing('1');

      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(mockPrismaService.listing.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: '1' } }),
      );
    });

    it('should throw NotFoundException if listing not found', async () => {
      mockPrismaService.listing.findUnique.mockResolvedValue(null);

      await expect(service.getListing('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createListing', () => {
    it('should create a new listing', async () => {
      const mockUser = {
        id: 'user-1',
        firstName: 'John',
        tgUserId: 123n,
      };

      const mockCategory = {
        id: 'cat-1',
        name: 'Category',
        slug: 'category',
      };

      const createData = {
        title: 'New Listing',
        description: 'Description',
        categoryId: 'cat-1',
        publish: false,
      };

      const mockCreatedListing = {
        id: 'new-listing-id',
        ...createData,
        status: 'draft',
        user: mockUser,
        category: mockCategory,
        photos: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: null,
        price: null,
        phone: null,
        email: null,
        location: null,
        userId: 'user-1',
        embedding: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.listing.create.mockResolvedValue(mockCreatedListing);

      const result = await service.createListing('user-1', createData);

      expect(result).toBeDefined();
      expect(result.title).toBe('New Listing');
      expect(mockPrismaService.listing.create).toHaveBeenCalled();
    });
  });

  describe('addComment', () => {
    it('should add a comment to a listing', async () => {
      const mockComment = {
        id: 'comment-1',
        text: 'Test comment',
        userId: 'user-1',
        listingId: 'listing-1',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.comment.create.mockResolvedValue(mockComment);

      const result = await service.addComment(
        'listing-1',
        'user-1',
        'Test comment',
      );

      expect(result).toBeDefined();
      expect(result.text).toBe('Test comment');
      expect(mockPrismaService.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            text: 'Test comment',
            userId: 'user-1',
            listingId: 'listing-1',
          }),
        }),
      );
    });
  });
});
