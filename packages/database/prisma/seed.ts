import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default categories
  const categories = [
    { slug: 'electronics', name: 'Электроника' },
    { slug: 'furniture', name: 'Мебель' },
    { slug: 'clothes', name: 'Одежда' },
    { slug: 'auto', name: 'Авто' },
    { slug: 'real-estate', name: 'Недвижимость' },
    { slug: 'services', name: 'Услуги' },
    { slug: 'jobs', name: 'Работа' },
    { slug: 'other', name: 'Другое' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  console.log('Categories created');

  // Create some default tags
  const tags = [
    { slug: 'срочно', name: 'Срочно' },
    { slug: 'новое', name: 'Новое' },
    { slug: 'б/у', name: 'Б/У' },
    { slug: 'торг', name: 'Торг' },
    { slug: 'доставка', name: 'Доставка' },
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: tag,
    });
  }

  console.log('Tags created');

  // Create test user
  // Note: password will be hashed by auth service on first login
  const testUser = await prisma.user.upsert({
    where: { phone: '+79999999999' },
    update: {},
    create: {
      phone: '+79999999999',
      password: '$2b$10$YourHashedPasswordHere', // dummy hash, will be updated on registration
      firstName: 'Тест',
      lastName: 'Пользователь',
      role: 'user',
    },
  });

  console.log('Test user created');

  // Get all categories
  const allCategories = await prisma.category.findMany();
  const allTags = await prisma.tag.findMany();

  // Create 20 listings (13 approved, 7 pending)
  const listingsData = [
    { title: 'iPhone 13 Pro 256GB', description: 'В отличном состоянии, все работает идеально. Комплект полный.', price: 45000, status: 'approved' },
    { title: 'Диван угловой', description: 'Удобный диван в хорошем состоянии. Самовывоз.', price: 15000, status: 'approved' },
    { title: 'Куртка зимняя мужская', description: 'Размер L, новая, с биркой.', price: 5000, status: 'approved' },
    { title: 'Toyota Camry 2015', description: 'Пробег 120 тыс. км, один хозяин, в отличном состоянии.', price: 950000, status: 'approved' },
    { title: 'Квартира 2-комнатная', description: 'Центр города, 56 кв.м, евроремонт.', price: 3500000, status: 'approved' },
    { title: 'Ремонт компьютеров', description: 'Быстро и качественно. Выезд на дом.', price: 500, status: 'approved' },
    { title: 'Требуется менеджер', description: 'В торговую компанию требуется менеджер по продажам.', price: 40000, status: 'approved' },
    { title: 'Ноутбук ASUS', description: 'Core i5, 8GB RAM, SSD 256GB. Состояние отличное.', price: 25000, status: 'approved' },
    { title: 'Стол письменный', description: 'Массив дерева, размер 120x60 см.', price: 8000, status: 'approved' },
    { title: 'Кроссовки Nike', description: 'Размер 42, оригинал, новые.', price: 7000, status: 'approved' },
    { title: 'Mazda 6 2018', description: 'Пробег 85 тыс. км, полная комплектация.', price: 1200000, status: 'approved' },
    { title: 'Дом с участком', description: '150 кв.м дом + 10 соток земли.', price: 5000000, status: 'approved' },
    { title: 'Репетитор математики', description: 'Опытный преподаватель. Подготовка к ЕГЭ.', price: 1000, status: 'approved' },
    { title: 'Samsung Galaxy S21', description: 'Флагманский смартфон в хорошем состоянии.', price: 30000, status: 'pending' },
    { title: 'Кресло офисное', description: 'Эргономичное кресло с регулировками.', price: 6000, status: 'pending' },
    { title: 'Пальто женское', description: 'Размер M, кашемир, новое.', price: 12000, status: 'pending' },
    { title: 'Honda CR-V 2017', description: 'Полный привод, пробег 95 тыс. км.', price: 1400000, status: 'pending' },
    { title: 'Комната в общежитии', description: '18 кв.м, косметический ремонт.', price: 800000, status: 'pending' },
    { title: 'Уборка квартир', description: 'Профессиональная уборка. Качественно.', price: 2000, status: 'pending' },
    { title: 'Ищу водителя', description: 'Требуется водитель категории B.', price: 35000, status: 'pending' },
  ];

  for (let i = 0; i < listingsData.length; i++) {
    const data = listingsData[i];
    const category = allCategories[i % allCategories.length];

    const listing = await prisma.listing.create({
      data: {
        userId: testUser.id,
        categoryId: category.id,
        title: data.title,
        description: data.description,
        price: data.price,
        status: data.status as any,
        publishedAt: data.status === 'approved' ? new Date() : null,
        moderatedAt: data.status === 'approved' ? new Date() : null,
      },
    });

    // Add random tags to each listing
    const randomTags = allTags.slice(0, Math.floor(Math.random() * 3) + 1);
    for (const tag of randomTags) {
      await prisma.listingTag.create({
        data: {
          listingId: listing.id,
          tagId: tag.id,
        },
      });
    }
  }

  console.log('20 listings created (13 approved, 7 pending)');

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });