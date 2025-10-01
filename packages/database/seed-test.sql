-- Тестовые данные для Kavbot
-- Запуск: docker-compose exec postgres psql -U kavbot -d kavbot -f /path/to/seed-test.sql

-- 1. Создание тестовых пользователей
INSERT INTO users (id, tg_user_id, username, first_name, last_name, role, is_banned, created_at)
VALUES
  (gen_random_uuid(), 123456789, 'test_user', 'Иван', 'Тестов', 'user', false, NOW()),
  (gen_random_uuid(), 987654321, 'maria_test', 'Мария', 'Петрова', 'user', false, NOW()),
  (gen_random_uuid(), 111222333, 'admin', 'Администратор', 'Системы', 'admin', false, NOW())
ON CONFLICT (tg_user_id) DO NOTHING;

-- 2. Получаем ID пользователей и категорий
DO $$
DECLARE
  user1_id UUID;
  user2_id UUID;
  electronics_id UUID;
  furniture_id UUID;
  auto_id UUID;
  services_id UUID;
  new_tag_id UUID;
  used_tag_id UUID;
  urgent_tag_id UUID;
  bargain_tag_id UUID;
  listing1_id UUID;
  listing2_id UUID;
  source_id UUID;
BEGIN
  -- Получаем ID
  SELECT id INTO user1_id FROM users WHERE tg_user_id = 123456789;
  SELECT id INTO user2_id FROM users WHERE tg_user_id = 987654321;
  SELECT id INTO electronics_id FROM categories WHERE slug = 'electronics';
  SELECT id INTO furniture_id FROM categories WHERE slug = 'furniture';
  SELECT id INTO auto_id FROM categories WHERE slug = 'auto';
  SELECT id INTO services_id FROM categories WHERE slug = 'services';
  SELECT id INTO new_tag_id FROM tags WHERE slug = 'новое';
  SELECT id INTO used_tag_id FROM tags WHERE slug = 'б/у';
  SELECT id INTO urgent_tag_id FROM tags WHERE slug = 'срочно';
  SELECT id INTO bargain_tag_id FROM tags WHERE slug = 'торг';

  -- 3. Создаем объявления
  INSERT INTO listings (id, user_id, title, description, category_id, price, status, published_at, updated_at, created_at)
  VALUES
    (gen_random_uuid(), user1_id, 'iPhone 13 Pro 256GB',
     'Продаю iPhone 13 Pro в отличном состоянии. Цвет графитовый, 256GB памяти. В комплекте зарядка и чехол. Телефон куплен год назад, использовался аккуратно. Царапин нет, экран без повреждений.',
     electronics_id, 65000, 'approved', '2024-01-15', NOW(), NOW())
    RETURNING id INTO listing1_id;

  INSERT INTO listing_tags (listing_id, tag_id) VALUES (listing1_id, new_tag_id), (listing1_id, bargain_tag_id);

  INSERT INTO listings (id, user_id, title, description, category_id, price, status, published_at, updated_at, created_at)
  VALUES
    (gen_random_uuid(), user2_id, 'Диван-книжка, б/у',
     'Продаю диван-книжку в хорошем состоянии. Цвет синий, механизм работает исправно. Небольшие потертости на подлокотниках. Размер: 200x90 см. Самовывоз из Кавалерово.',
     furniture_id, 8000, 'approved', '2024-01-14', NOW(), NOW())
    RETURNING id INTO listing2_id;

  INSERT INTO listing_tags (listing_id, tag_id) VALUES (listing2_id, used_tag_id), (listing2_id, bargain_tag_id);

  listing1_id := gen_random_uuid();
  INSERT INTO listings (id, user_id, title, description, category_id, price, status, published_at, updated_at, created_at)
  VALUES
    (listing1_id, user1_id, 'Toyota Corolla 2015',
     'Продаю Toyota Corolla 2015 года. Пробег 120 тыс км, один хозяин. Состояние отличное, все ТО пройдены в срок. Зимняя и летняя резина в комплекте. Не битая, не крашеная.',
     auto_id, 850000, 'approved', '2024-01-13', NOW(), NOW());

  INSERT INTO listing_tags (listing_id, tag_id) VALUES (listing1_id, used_tag_id);

  listing1_id := gen_random_uuid();
  INSERT INTO listings (id, user_id, title, description, category_id, price, status, published_at, updated_at, created_at)
  VALUES
    (listing1_id, user2_id, 'MacBook Air M1 2020',
     'Продаю ноутбук Apple MacBook Air M1 2020. 8GB RAM, 256GB SSD. Состояние идеальное, использовался только дома. В комплекте оригинальная зарядка и коробка. Батарея держит отлично.',
     electronics_id, 55000, 'approved', '2024-01-12', NOW(), NOW());

  INSERT INTO listing_tags (listing_id, tag_id) VALUES (listing1_id, used_tag_id), (listing1_id, bargain_tag_id);

  listing1_id := gen_random_uuid();
  INSERT INTO listings (id, user_id, title, description, category_id, price, status, published_at, updated_at, created_at)
  VALUES
    (listing1_id, user1_id, 'Ремонт компьютеров и ноутбуков',
     'Предлагаю услуги по ремонту компьютеров и ноутбуков. Диагностика, чистка, замена комплектующих, установка ПО. Выезд на дом. Опыт работы 10 лет. Гарантия на все работы.',
     services_id, 500, 'approved', '2024-01-11', NOW(), NOW());

  listing1_id := gen_random_uuid();
  INSERT INTO listings (id, user_id, title, description, category_id, price, status, updated_at, created_at)
  VALUES
    (listing1_id, user2_id, 'Кухонный гарнитур новый',
     'Продаю новый кухонный гарнитур. Длина 2.5 метра, цвет белый с деревянной столешницей. Включает верхние и нижние шкафы, мойку из нержавейки. Производство Россия.',
     furniture_id, 45000, 'pending', NOW(), NOW());

  INSERT INTO listing_tags (listing_id, tag_id) VALUES (listing1_id, new_tag_id), (listing1_id, urgent_tag_id);

  -- 4. Создаем комментарии
  listing1_id := (SELECT id FROM listings WHERE title = 'iPhone 13 Pro 256GB' LIMIT 1);
  IF listing1_id IS NOT NULL THEN
    INSERT INTO comments (id, listing_id, user_id, text, created_at)
    VALUES
      (gen_random_uuid(), listing1_id, user2_id, 'Интересует эта вещь! Можно посмотреть в выходные?', NOW()),
      (gen_random_uuid(), listing1_id, user1_id, 'Да, конечно! Напишите в личку, договоримся о времени.', NOW());
  END IF;

  -- 5. Создаем источник
  INSERT INTO sources (id, type, handle_or_url, title, is_active, created_at)
  VALUES (gen_random_uuid(), 'telegram', '@kavalerovonews', 'Новости Кавалерово', true, NOW())
  ON CONFLICT (type, handle_or_url) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO source_id;

  -- 6. Создаем документы
  INSERT INTO documents (id, source_id, doc_type, title, text, url, published_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), source_id, 'news', 'Открытие нового магазина в центре города',
     'Сегодня, 15 января, в центре Кавалерово открылся новый продуктовый магазин "Продукты 24". Магазин работает круглосуточно и предлагает широкий ассортимент товаров по доступным ценам. В день открытия действуют специальные скидки до 30%.',
     'https://example.com/news/1', '2024-01-15 10:00:00', NOW(), NOW()),

    (gen_random_uuid(), source_id, 'outage', 'Плановое отключение электроэнергии 20 января',
     'Уважаемые жители! 20 января с 9:00 до 16:00 будет производиться плановое отключение электроэнергии на улицах Ленина, Гагарина, Школьная. Отключение связано с ремонтными работами на подстанции. Просим отнестись с пониманием.',
     NULL, '2024-01-14 14:00:00', NOW(), NOW()),

    (gen_random_uuid(), source_id, 'event', 'Лыжные гонки 25 января',
     'Приглашаем всех желающих принять участие в традиционных лыжных гонках, которые пройдут 25 января на стадионе "Юность". Начало в 11:00. Регистрация участников с 10:00. Категории: дети до 14 лет, юноши/девушки 15-18 лет, взрослые. Призы победителям!',
     NULL, '2024-01-13 16:00:00', NOW(), NOW()),

    (gen_random_uuid(), source_id, 'news', 'Работа библиотеки в январе',
     'Центральная библиотека информирует о режиме работы в январе: понедельник-пятница с 9:00 до 18:00, суббота с 10:00 до 16:00, воскресенье - выходной. Приглашаем посетить новую выставку книг местных авторов.',
     NULL, '2024-01-12 12:00:00', NOW(), NOW());

  -- 7. Создаем мероприятие
  INSERT INTO events (id, doc_id, event_type, starts_at, place)
  SELECT gen_random_uuid(), id, 'event', '2024-01-25 11:00:00', 'Стадион "Юность"'
  FROM documents WHERE title = 'Лыжные гонки 25 января' LIMIT 1;

  -- 8. Создаем место
  INSERT INTO places (id, name, category, address, contacts, schedule, meta, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    'Спортивный клуб "Атлет"',
    'Спорт',
    'ул. Спортивная, 15',
    '{"phone": "+7 (423) 555-01-23", "email": "atlet@example.com"}',
    '{"weekdays": "8:00-22:00", "weekends": "9:00-20:00"}',
    '{"description": "Тренажерный зал, групповые занятия, бассейн", "services": ["Тренажерный зал", "Бассейн", "Йога", "Фитнес"]}',
    NOW(),
    NOW()
  );

END $$;

-- Вывод статистики
SELECT
  'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Listings', COUNT(*) FROM listings
UNION ALL
SELECT 'Documents', COUNT(*) FROM documents
UNION ALL
SELECT 'Comments', COUNT(*) FROM comments
UNION ALL
SELECT 'Sources', COUNT(*) FROM sources
UNION ALL
SELECT 'Events', COUNT(*) FROM events
UNION ALL
SELECT 'Places', COUNT(*) FROM places;