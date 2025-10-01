import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding test data...');

  // 1. Create test users
  const testUser1 = await prisma.user.upsert({
    where: { tgUserId: BigInt(123456789) },
    update: {},
    create: {
      tgUserId: BigInt(123456789),
      username: 'test_user',
      firstName: 'Иван',
      lastName: 'Тестов',
      role: 'user',
    },
  });

  const testUser2 = await prisma.user.upsert({
    where: { tgUserId: BigInt(987654321) },
    update: {},
    create: {
      tgUserId: BigInt(987654321),
      username: 'maria_test',
      firstName: 'Мария',
      lastName: 'Петрова',
      role: 'user',
    },
  });

  await prisma.user.upsert({
    where: { tgUserId: BigInt(111222333) },
    update: {},
    create: {
      tgUserId: BigInt(111222333),
      username: 'admin',
      firstName: 'Администратор',
      lastName: 'Системы',
      role: 'admin',
    },
  });

  console.log(`Users created: ${testUser1.username}, ${testUser2.username}, admin`);

  // 2. Get categories and tags
  const electronicsCategory = await prisma.category.findUnique({
    where: { slug: 'electronics' },
  });
  const furnitureCategory = await prisma.category.findUnique({
    where: { slug: 'furniture' },
  });
  const autoCategory = await prisma.category.findUnique({
    where: { slug: 'auto' },
  });
  const servicesCategory = await prisma.category.findUnique({
    where: { slug: 'services' },
  });

  const newTag = await prisma.tag.findUnique({ where: { slug: 'новое' } });
  const usedTag = await prisma.tag.findUnique({ where: { slug: 'б/у' } });
  const urgentTag = await prisma.tag.findUnique({ where: { slug: 'срочно' } });
  const bargainTag = await prisma.tag.findUnique({ where: { slug: 'торг' } });

  // 3. Create test listings
  const listings = [
    {
      userId: testUser1.id,
      title: 'iPhone 13 Pro 256GB',
      description:
        'Продаю iPhone 13 Pro в отличном состоянии. Цвет графитовый, 256GB памяти. В комплекте зарядка и чехол. Телефон куплен год назад, использовался аккуратно. Царапин нет, экран без повреждений.',
      categoryId: electronicsCategory!.id,
      price: 65000,
      status: 'approved' as const,
      publishedAt: new Date('2024-01-15'),
      tags: [newTag!.id, bargainTag!.id],
    },
    {
      userId: testUser2.id,
      title: 'Диван-книжка, б/у',
      description:
        'Продаю диван-книжку в хорошем состоянии. Цвет синий, механизм работает исправно. Небольшие потертости на подлокотниках. Размер: 200x90 см. Самовывоз из Кавалерово.',
      categoryId: furnitureCategory!.id,
      price: 8000,
      status: 'approved' as const,
      publishedAt: new Date('2024-01-14'),
      tags: [usedTag!.id, bargainTag!.id],
    },
    {
      userId: testUser1.id,
      title: 'Toyota Corolla 2015',
      description:
        'Продаю Toyota Corolla 2015 года. Пробег 120 тыс км, один хозяин. Состояние отличное, все ТО пройдены в срок. Зимняя и летняя резина в комплекте. Не битая, не крашеная.',
      categoryId: autoCategory!.id,
      price: 850000,
      status: 'approved' as const,
      publishedAt: new Date('2024-01-13'),
      tags: [usedTag!.id],
    },
    {
      userId: testUser2.id,
      title: 'MacBook Air M1 2020',
      description:
        'Продаю ноутбук Apple MacBook Air M1 2020. 8GB RAM, 256GB SSD. Состояние идеальное, использовался только дома. В комплекте оригинальная зарядка и коробка. Батарея держит отлично.',
      categoryId: electronicsCategory!.id,
      price: 55000,
      status: 'approved' as const,
      publishedAt: new Date('2024-01-12'),
      tags: [usedTag!.id, bargainTag!.id],
    },
    {
      userId: testUser1.id,
      title: 'Ремонт компьютеров и ноутбуков',
      description:
        'Предлагаю услуги по ремонту компьютеров и ноутбуков. Диагностика, чистка, замена комплектующих, установка ПО. Выезд на дом. Опыт работы 10 лет. Гарантия на все работы.',
      categoryId: servicesCategory!.id,
      price: 500,
      status: 'approved' as const,
      publishedAt: new Date('2024-01-11'),
      tags: [],
    },
    {
      userId: testUser2.id,
      title: 'Кухонный гарнитур новый',
      description:
        'Продаю новый кухонный гарнитур. Длина 2.5 метра, цвет белый с деревянной столешницей. Включает верхние и нижние шкафы, мойку из нержавейки. Производство Россия.',
      categoryId: furnitureCategory!.id,
      price: 45000,
      status: 'pending' as const,
      tags: [newTag!.id, urgentTag!.id],
    },
    {
      userId: testUser1.id,
      title: 'Велосипед горный Stels',
      description:
        'Горный велосипед Stels Navigator 21 скорость. Состояние хорошее, недавно прошел ТО. Амортизационная вилка, дисковые тормоза. Подходит для роста 165-180 см.',
      categoryId: electronicsCategory!.id,
      price: 12000,
      status: 'approved' as const,
      publishedAt: new Date('2024-01-10'),
      tags: [usedTag!.id],
    },
    {
      userId: testUser2.id,
      title: 'Детская коляска трансформер',
      description:
        'Продаю детскую коляску-трансформер 3 в 1 (люлька, прогулочный блок, автокресло). Цвет серый, состояние отличное. В комплекте дождевик, москитная сетка, сумка для мамы.',
      categoryId: furnitureCategory!.id,
      price: 15000,
      status: 'approved' as const,
      publishedAt: new Date('2024-01-09'),
      tags: [usedTag!.id, bargainTag!.id],
    },
  ];

  for (const listingData of listings) {
    const { tags, ...data } = listingData;
    const listing = await prisma.listing.create({
      data: {
        ...data,
        tags: {
          create: tags.map((tagId) => ({
            tagId,
          })),
        },
      },
    });
    console.log(`Created listing: ${listing.title}`);
  }

  // 4. Create test comments
  const firstListing = await prisma.listing.findFirst({
    where: { status: 'approved' },
    orderBy: { publishedAt: 'desc' },
  });

  if (firstListing) {
    await prisma.comment.create({
      data: {
        listingId: firstListing.id,
        userId: testUser2.id,
        text: 'Интересует эта вещь! Можно посмотреть в выходные?',
      },
    });

    await prisma.comment.create({
      data: {
        listingId: firstListing.id,
        userId: testUser1.id,
        text: 'Да, конечно! Напишите в личку, договоримся о времени.',
      },
    });

    console.log('Comments created');
  }

  // 5. Create test sources
  const testSource = await prisma.source.upsert({
    where: {
      type_handleOrUrl: {
        type: 'telegram',
        handleOrUrl: '@kavalerovonews',
      },
    },
    update: {},
    create: {
      type: 'telegram',
      handleOrUrl: '@kavalerovonews',
      title: 'Новости Кавалерово',
      isActive: true,
    },
  });

  console.log('Test source created');

  // 6. Create test documents
  const documents = [
    {
      sourceId: testSource.id,
      docType: 'news' as const,
      title: 'Открытие нового магазина в центре города',
      text: 'Сегодня, 15 января, в центре Кавалерово открылся новый продуктовый магазин "Продукты 24". Магазин работает круглосуточно и предлагает широкий ассортимент товаров по доступным ценам. В день открытия действуют специальные скидки до 30%.',
      url: 'https://example.com/news/1',
      publishedAt: new Date('2024-01-15T10:00:00Z'),
    },
    {
      sourceId: testSource.id,
      docType: 'outage' as const,
      title: 'Плановое отключение электроэнергии 20 января',
      text: 'Уважаемые жители! 20 января с 9:00 до 16:00 будет производиться плановое отключение электроэнергии на улицах Ленина, Гагарина, Школьная. Отключение связано с ремонтными работами на подстанции. Просим отнестись с пониманием.',
      publishedAt: new Date('2024-01-14T14:00:00Z'),
    },
    {
      sourceId: testSource.id,
      docType: 'event' as const,
      title: 'Лыжные гонки 25 января',
      text: 'Приглашаем всех желающих принять участие в традиционных лыжных гонках, которые пройдут 25 января на стадионе "Юность". Начало в 11:00. Регистрация участников с 10:00. Категории: дети до 14 лет, юноши/девушки 15-18 лет, взрослые. Призы победителям!',
      publishedAt: new Date('2024-01-13T16:00:00Z'),
    },
    {
      sourceId: testSource.id,
      docType: 'news' as const,
      title: 'Работа библиотеки в январе',
      text: 'Центральная библиотека информирует о режиме работы в январе: понедельник-пятница с 9:00 до 18:00, суббота с 10:00 до 16:00, воскресенье - выходной. Приглашаем посетить новую выставку книг местных авторов.',
      publishedAt: new Date('2024-01-12T12:00:00Z'),
    },
  ];

  for (const doc of documents) {
    await prisma.document.create({
      data: doc,
    });
  }

  console.log('Test documents created');

  // 7. Create test event
  const eventDoc = await prisma.document.findFirst({
    where: { docType: 'event' },
  });

  if (eventDoc) {
    await prisma.event.create({
      data: {
        docId: eventDoc.id,
        eventType: 'event',
        startsAt: new Date('2024-01-25T11:00:00Z'),
        place: 'Стадион "Юность"',
      },
    });
    console.log('Test event created');
  }

  // 8. Create test place
  await prisma.place.create({
    data: {
      name: 'Спортивный клуб "Атлет"',
      category: 'Спорт',
      address: 'ул. Спортивная, 15',
      contacts: {
        phone: '+7 (423) 555-01-23',
        email: 'atlet@example.com',
      },
      schedule: {
        weekdays: '8:00-22:00',
        weekends: '9:00-20:00',
      },
      meta: {
        description: 'Тренажерный зал, групповые занятия, бассейн',
        services: ['Тренажерный зал', 'Бассейн', 'Йога', 'Фитнес'],
      },
    },
  });

  console.log('Test place created');

  console.log('✅ Test data seeding completed!');
  console.log(`
📊 Summary:
- Users: 3 (1 admin, 2 regular)
- Listings: ${listings.length} (${listings.filter((l) => l.status === 'approved').length} approved, ${listings.filter((l) => l.status === 'pending').length} pending)
- Documents: ${documents.length}
- Comments: 2
- Sources: 1
- Events: 1
- Places: 1
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });