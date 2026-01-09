from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from decimal import Decimal
from pathlib import Path

from dashboards.models import Dashboard, Marketplace, DiscountRule
from content.models import (
    Persona, ProcessStep, SchemeFlow, Benefit, 
    SocialProofMetric, FAQ, CompanyInfo
)
from blog.models import BlogCategory, BlogPost, RelatedPost


class Command(BaseCommand):
    help = 'Загружает начальные данные из статических HTML файлов'

    def handle(self, *args, **options):
        self.stdout.write('Начинаем загрузку данных...')
        
        # 1. Маркетплейсы
        self.create_marketplaces()
        
        # 2. Дашборды
        self.create_dashboards()
        
        # 3. Персонажи
        self.create_personas()
        
        # 4. Схема взаимодействия
        self.create_scheme_flows()
        
        # 5. Шаги процесса
        self.create_process_steps()
        
        # 6. Преимущества
        self.create_benefits()
        
        # 7. Метрики
        self.create_metrics()
        
        # 8. FAQ
        self.create_faqs()
        
        # 9. Информация о компании
        self.create_company_info()
        
        # 10. Блог
        self.create_blog_data()
        
        self.stdout.write(self.style.SUCCESS('Данные успешно загружены!'))

    def create_marketplaces(self):
        self.stdout.write('Создаем маркетплейсы...')
        Marketplace.objects.get_or_create(
            id='Wildberries',
            defaults={
                'name': 'Wildberries',
                'is_active': True,
                'order': 1,
            }
        )
        Marketplace.objects.get_or_create(
            id='OZON',
            defaults={
                'name': 'OZON',
                'is_active': True,
                'order': 2,
            }
        )
        self.stdout.write(self.style.SUCCESS('  [OK] Маркетплейсы созданы'))

    def create_dashboards(self):
        self.stdout.write('Создаем дашборды...')
        
        dashboards_data = [
            {
                'id': 'sales-insights',
                'title': 'Продажи и финансы',
                'subtitle': 'Глубокая аналитика выручки, прибыли и остатков',
                'base_price': Decimal('18000.00'),
                'preview': 'Скрин продаж',
                'description': 'Мгновенно видите динамику продаж по SKU, чистую прибыль и прогноз остатков.',
                'details': 'Настраиваем модели Power BI под ваши категории, подключаем до 10 кабинетов, добавляем контроль buy-box и возвратов.',
                'order': 1,
            },
            {
                'id': 'ads-optimizer',
                'title': 'Оптимизатор рекламы',
                'subtitle': 'Единый контроль РК Wildberries и OZON',
                'base_price': Decimal('15000.00'),
                'preview': 'Скрин рекламы',
                'description': 'Сравнивайте эффективность кампаний в разных каналах, держите CAC под контролем.',
                'details': 'Рекомендации по ставкам, подсказки по ключевым словам, алерты при просадке конверсии.',
                'order': 2,
            },
            {
                'id': 'supply-chain',
                'title': 'Логистика и склады',
                'subtitle': 'Прогнозируйте остатки и экономьте на FBO/FBS',
                'base_price': Decimal('12000.00'),
                'preview': 'Скрин логистики',
                'description': 'Оптимальный запас по складам, предупреждения о риске out-of-stock.',
                'details': 'Модели учитывают сезонность, скорость продаж и сроки поставок, есть API для ERP.',
                'order': 3,
            },
        ]
        
        for data in dashboards_data:
            dashboard, created = Dashboard.objects.get_or_create(
                id=data['id'],
                defaults=data
            )
            if created:
                # Создаем примеры правил скидок
                DiscountRule.objects.get_or_create(
                    dashboard=dashboard,
                    discount_type='months',
                    min_value=6,
                    defaults={
                        'discount_percent': Decimal('10.00'),
                        'description': 'Скидка 10% за подписку от 6 месяцев',
                        'is_active': True,
                        'order': 1,
                    }
                )
                DiscountRule.objects.get_or_create(
                    dashboard=dashboard,
                    discount_type='cabinets',
                    min_value=10,
                    defaults={
                        'discount_percent': Decimal('15.00'),
                        'description': 'Скидка 15% за 10+ кабинетов',
                        'is_active': True,
                        'order': 2,
                    }
                )
        
        self.stdout.write(self.style.SUCCESS('  [OK] Дашборды созданы'))

    def create_personas(self):
        self.stdout.write('Создаем типы продавцов...')
        
        personas_data = [
            {
                'title': 'Новичок',
                'description': 'Понимание спроса, прогноз остатков, контроль дебюта бренда. Помогаем выбрать прибыльный ассортимент.',
                'order': 1,
            },
            {
                'title': 'Действующий селлер',
                'description': 'Углубленная аналитика рекламных кампаний, автоматический контроль скидок и buy-box.',
                'order': 2,
            },
            {
                'title': 'Крупный бизнес',
                'description': 'Консолидация многобрендовых аккаунтов, SLA на поддержку, white-label доступ к показателям.',
                'order': 3,
            },
            {
                'title': 'Агентство / интегратор',
                'description': 'Шаблоны отчётности для клиентов, управление доступами, API для встраивания в свои сервисы.',
                'order': 4,
            },
        ]
        
        for data in personas_data:
            Persona.objects.get_or_create(
                title=data['title'],
                defaults=data
            )
        
        self.stdout.write(self.style.SUCCESS('  [OK] Типы продавцов созданы'))

    def create_scheme_flows(self):
        self.stdout.write('Создаем схему взаимодействия...')
        
        flows_data = [
            {
                'step_number': 1,
                'tag': 'Подключение',
                'title': 'API-подключение кабинетов Wildberries и OZON',
                'description': 'Делаем безопасную связку, проверяем роли и тестируем доступы.',
                'order': 1,
            },
            {
                'step_number': 2,
                'tag': 'ETL',
                'title': 'ETL-процесс → хранилище → Power BI модели',
                'description': 'Выстраиваем pipeline, ставим мониторинги и SLA на обновления.',
                'order': 2,
            },
            {
                'step_number': 3,
                'tag': 'Права',
                'title': 'Настройка прав и рабочих пространств',
                'description': 'Создаём рабочие области, доступы по ролям и аудит действий.',
                'order': 3,
            },
            {
                'step_number': 4,
                'tag': 'Обновление',
                'title': 'Автообновление данных каждые 2 часа',
                'description': 'Оптимизируем расписания, включаем алерты и контроль свежести.',
                'order': 4,
            },
            {
                'step_number': 5,
                'tag': 'Доступ',
                'title': 'Доступ из web + mobile Power BI',
                'description': 'Готовим пресеты дашбордов, шэрим ссылки и обучаем команду.',
                'order': 5,
            },
        ]
        
        for data in flows_data:
            SchemeFlow.objects.get_or_create(
                step_number=data['step_number'],
                defaults=data
            )
        
        self.stdout.write(self.style.SUCCESS('  [OK] Схема взаимодействия создана'))

    def create_process_steps(self):
        self.stdout.write('Создаем шаги процесса...')
        
        steps_data = [
            {
                'step_number': 1,
                'title': 'Собрать конфигурацию',
                'description': 'Отметьте маркетплейсы, кабинеты и опции в конфигураторе — сразу увидите стоимость и наполнение.',
                'time_tag': '5 минут',
                'items': [
                    'WB, OZON и дополнительные площадки по запросу',
                    'Роли, права, период подписки и оплата в одном окне',
                ],
                'order': 1,
            },
            {
                'step_number': 2,
                'title': 'Создать аккаунт',
                'description': 'Регистрируем личный кабинет, добавляем команду и контактные данные для безопасного подключения.',
                'time_tag': '3 минуты',
                'items': [
                    'Приглашения коллегам и разграничение доступов',
                    'Проверка ролей и соответствия требованиям безопасности',
                ],
                'order': 2,
            },
            {
                'step_number': 3,
                'title': 'Оплатить и подключить',
                'description': 'Оплачиваем подписку, настраиваем токены и API, включаем мониторинг обновлений данных.',
                'time_tag': 'до 1 часа',
                'items': [
                    'Единый счёт или онлайн-оплата на выбор',
                    'Настройка ETL, расписаний и контроль свежести данных',
                ],
                'order': 3,
            },
            {
                'step_number': 4,
                'title': 'Начать пользоваться',
                'description': 'Вы получаете доступ к дашбордам, готовые пресеты и инструкции — команда сразу видит ключевые метрики.',
                'time_tag': 'в день запуска',
                'items': [
                    'Онбординг-сессия и быстрые гайды для команды',
                    'Алерты, отчёты и аналитика в web + Power BI mobile',
                ],
                'order': 4,
            },
        ]
        
        for data in steps_data:
            ProcessStep.objects.get_or_create(
                step_number=data['step_number'],
                defaults=data
            )
        
        self.stdout.write(self.style.SUCCESS('  [OK] Шаги процесса созданы'))

    def create_benefits(self):
        self.stdout.write('Создаем преимущества...')
        
        benefits_data = [
            {
                'title': 'Единая точка входа',
                'description': 'Все данные маркетплейсов и BI-инструментов в единой модели.',
                'icon_svg': '''<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="32" fill="url(#gradient-benefit-1)" opacity="0.12"/>
              <rect x="14" y="18" width="20" height="14" rx="2" stroke="url(#gradient-benefit-1)" stroke-width="2.5"/>
              <rect x="30" y="18" width="20" height="14" rx="2" stroke="url(#gradient-benefit-1)" stroke-width="2.5"/>
              <rect x="14" y="34" width="20" height="14" rx="2" stroke="url(#gradient-benefit-1)" stroke-width="2.5"/>
              <rect x="30" y="34" width="20" height="14" rx="2" stroke="url(#gradient-benefit-1)" stroke-width="2.5"/>
              <line x1="24" y1="22" x2="24" y2="28" stroke="url(#gradient-benefit-1)" stroke-width="2" stroke-linecap="round"/>
              <line x1="40" y1="22" x2="40" y2="28" stroke="url(#gradient-benefit-1)" stroke-width="2" stroke-linecap="round"/>
              <line x1="24" y1="38" x2="24" y2="44" stroke="url(#gradient-benefit-1)" stroke-width="2" stroke-linecap="round"/>
              <line x1="40" y1="38" x2="40" y2="44" stroke="url(#gradient-benefit-1)" stroke-width="2" stroke-linecap="round"/>
              <defs>
                <linearGradient id="gradient-benefit-1" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#6A5ACD"/>
                  <stop offset="1" stop-color="#483D8B"/>
                </linearGradient>
              </defs>
            </svg>''',
                'order': 1,
            },
            {
                'title': 'Гибкая подписка',
                'description': 'Оплачиваете только те инструменты, что нужны сейчас.',
                'icon_svg': '''<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="32" fill="url(#gradient-benefit-2)" opacity="0.12"/>
              <circle cx="32" cy="32" r="12" stroke="url(#gradient-benefit-2)" stroke-width="2.5"/>
              <path d="M32 20L35 28L32 32L29 28L32 20Z" fill="url(#gradient-benefit-2)" opacity="0.4"/>
              <path d="M44 32L36 29L32 32L36 35L44 32Z" fill="url(#gradient-benefit-2)" opacity="0.4"/>
              <path d="M32 44L29 36L32 32L35 36L32 44Z" fill="url(#gradient-benefit-2)" opacity="0.4"/>
              <path d="M20 32L28 35L32 32L28 29L20 32Z" fill="url(#gradient-benefit-2)" opacity="0.4"/>
              <circle cx="32" cy="26" r="2" fill="url(#gradient-benefit-2)"/>
              <circle cx="38" cy="32" r="2" fill="url(#gradient-benefit-2)"/>
              <circle cx="32" cy="38" r="2" fill="url(#gradient-benefit-2)"/>
              <circle cx="26" cy="32" r="2" fill="url(#gradient-benefit-2)"/>
              <defs>
                <linearGradient id="gradient-benefit-2" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#6A5ACD"/>
                  <stop offset="1" stop-color="#483D8B"/>
                </linearGradient>
              </defs>
            </svg>''',
                'order': 2,
            },
            {
                'title': 'B2B-поддержка',
                'description': 'SLA, выделенный аккаунт и документация для команды.',
                'icon_svg': '''<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="32" fill="url(#gradient-benefit-3)" opacity="0.12"/>
              <path d="M20 28C20 24.6863 22.6863 22 26 22H38C41.3137 22 44 24.6863 44 28V36C44 39.3137 41.3137 42 38 42H26C22.6863 42 20 39.3137 20 36V28Z" stroke="url(#gradient-benefit-3)" stroke-width="2.5"/>
              <path d="M20 30L28 36L32 32L44 42" stroke="url(#gradient-benefit-3)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="28" cy="32" r="2" fill="url(#gradient-benefit-3)"/>
              <circle cx="32" cy="32" r="2" fill="url(#gradient-benefit-3)"/>
              <circle cx="36" cy="32" r="2" fill="url(#gradient-benefit-3)"/>
              <defs>
                <linearGradient id="gradient-benefit-3" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#6A5ACD"/>
                  <stop offset="1" stop-color="#483D8B"/>
                </linearGradient>
              </defs>
            </svg>''',
                'order': 3,
            },
            {
                'title': 'Безопасность',
                'description': 'Шифрование данных, аудит действий, контроль доступов.',
                'icon_svg': '''<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="32" fill="url(#gradient-benefit-4)" opacity="0.12"/>
              <path d="M32 18L24 22V30C24 36.6274 29.3726 42 36 42C38.5773 42 40.9397 41.1605 42.8284 39.6569" stroke="url(#gradient-benefit-4)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M32 18L40 22V30C40 36.6274 34.6274 42 28 42C25.4227 42 23.0603 41.1605 21.1716 39.6569" stroke="url(#gradient-benefit-4)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M32 18V26" stroke="url(#gradient-benefit-4)" stroke-width="2.5" stroke-linecap="round"/>
              <path d="M24 30L32 34L40 30" stroke="url(#gradient-benefit-4)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="32" cy="32" r="8" fill="url(#gradient-benefit-4)" opacity="0.2"/>
              <path d="M30 32L31.5 33.5L34 31" stroke="url(#gradient-benefit-4)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <defs>
                <linearGradient id="gradient-benefit-4" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#6A5ACD"/>
                  <stop offset="1" stop-color="#483D8B"/>
                </linearGradient>
              </defs>
            </svg>''',
                'order': 4,
            },
        ]
        
        # Создаем директорию для иконок, если её нет
        icons_dir = Path(settings.MEDIA_ROOT) / 'benefits' / 'icons'
        icons_dir.mkdir(parents=True, exist_ok=True)
        
        for data in benefits_data:
            benefit, created = Benefit.objects.get_or_create(
                title=data['title'],
                defaults={
                    'description': data.get('description', ''),
                    'order': data.get('order', 0),
                    'is_active': data.get('is_active', True),
                }
            )
            
            # Обрабатываем SVG-иконку
            icon_svg = data.get('icon_svg', '')
            if icon_svg:
                # Создаем имя файла на основе ID и заголовка
                safe_title = "".join(c for c in benefit.title if c.isalnum() or c in (' ', '-', '_')).strip()
                safe_title = safe_title.replace(' ', '_')
                filename = f"benefit_{benefit.id}_{safe_title}.svg"
                filepath = icons_dir / filename
                
                # Сохраняем SVG-код в файл
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(icon_svg)
                
                # Обновляем поле icon_image
                relative_path = f"benefits/icons/{filename}"
                benefit.icon_image = relative_path
            
            # Обновляем другие поля, если они изменились
            if not created:
                benefit.description = data.get('description', benefit.description)
                benefit.order = data.get('order', benefit.order)
                benefit.is_active = data.get('is_active', True)
            
            benefit.save()
        
        self.stdout.write(self.style.SUCCESS('  [OK] Преимущества созданы'))

    def create_metrics(self):
        self.stdout.write('Создаем метрики...')
        
        metrics_data = [
            {
                'label': 'Клиенты',
                'value': '3000+',
                'description': 'селлеров уже используют НекстАналитика',
                'order': 1,
            },
            {
                'label': 'GMV под управлением',
                'value': '12 млрд ₽',
                'description': 'в обороте клиентов на платформе',
                'order': 2,
            },
            {
                'label': 'Скорость реакции',
                'value': '2 часа',
                'description': 'среднее время ответа службы поддержки',
                'order': 3,
            },
        ]
        
        for data in metrics_data:
            SocialProofMetric.objects.get_or_create(
                label=data['label'],
                defaults=data
            )
        
        self.stdout.write(self.style.SUCCESS('  [OK] Метрики созданы'))

    def create_faqs(self):
        self.stdout.write('Создаем FAQ...')
        
        faqs_data = [
            {
                'question': 'Как быстро подключаются данные?',
                'answer': 'В среднем 3–5 рабочих дней. Первые отчёты доступны уже через 24 часа после подключения кабинетов.',
                'is_expanded': True,
                'order': 1,
            },
            {
                'question': 'Можно ли оплатить одним счётом сразу несколько дашбордов?',
                'answer': 'Да, мы выставляем единый счёт с детальной расшифровкой по каждому инструменту и опциям.',
                'is_expanded': False,
                'order': 2,
            },
            {
                'question': 'Есть ли обучение?',
                'answer': 'Проводим живые сессии и даём библиотеку self-paced материалов.',
                'is_expanded': False,
                'order': 3,
            },
        ]
        
        for data in faqs_data:
            FAQ.objects.get_or_create(
                question=data['question'],
                defaults=data
            )
        
        self.stdout.write(self.style.SUCCESS('  [OK] FAQ созданы'))

    def create_company_info(self):
        self.stdout.write('Создаем информацию о компании...')
        
        company_info, created = CompanyInfo.objects.get_or_create(
            pk=1,
            defaults={
                'company_name': 'ООО «Пульс Би Ай»',
                'inn': '7701234567',
                'kpp': '770101001',
                'bik': '044525000',
                'account_number': '40702810012345678901',
                'bank_name': 'ПАО «Условный банк»',
                'legal_address': 'Москва, ул. Прототипная, 5',
                'office_address': 'Москва Сити, башня «IQ»',
                'phone': '+7 800 123-45-67',
                'email_sales': 'sales@pulsebi.ru',
                'email_support': 'support@pulsebi.ru',
                'email_hr': 'hr@pulsebi.ru',
                'working_hours': 'Будни 09:00–20:00, выходные 10:00–18:00',
            }
        )
        
        self.stdout.write(self.style.SUCCESS('  [OK] Информация о компании создана'))

    def create_blog_data(self):
        self.stdout.write('Создаем данные блога...')
        
        # Создаем категорию
        category, _ = BlogCategory.objects.get_or_create(
            slug='analytics',
            defaults={
                'name': 'Аналитика',
                'is_active': True,
            }
        )
        
        # Создаем статью
        article_content = """
        <p>Компании часто перестают расти не из-за отсутствия спроса, а из-за недостаточной скорости принятия решений. Чтобы расширять SKU и удерживать маржинальность, нужно заранее видеть потенциал категорий и сезонность. Делимся подходом, который наши клиенты используют в НекстАналитика, оценивая перспективы за 30 минут.</p>

        <h2>1. Быстрое скрининг-исследование</h2>
        <p>Начинаем с верхнего уровня — смотрим объём GMV категории, темпы роста и типичные скидки. Это помогает понять, стоит ли продолжать копать глубже. Если категория стагнирует, но имеет высокую маржу, она может быть интересна для нишевого предложения.</p>

        <blockquote>
          <p>«Если вы не измеряете эффективность категории хотя бы раз в месяц, вы управляете ассортиментом вслепую.»</p>
          <cite>— Анна Ким, CPO НекстАналитика</cite>
        </blockquote>

        <p>После скрининга переходим к анализу спроса и конкуренции. Смотрим количество активных продавцов, их долю рынка, частоту выходов новых SKU. Важно оценивать и барьеры входа — средний чек маркетинговых кампаний, требования к логистике и скорости отгрузки.</p>

        <h2>2. Чек-лист аналитика категории</h2>
        <ul>
          <li>Маржинальность после всех скидок и комиссий.</li>
          <li>Структура трафика: карточки, реклама, рекомендации.</li>
          <li>Рейтинг клиентов и количество отзывов у лидеров.</li>
          <li>Скорость оборачиваемости товара и возвраты.</li>
        </ul>

        <p>Когда найдены перспективные подкатегории, важно заранее протестировать рекламные связки. В нашей практике хорошо работает стратегия быстрого MVP: выводим ограниченную партию, подключаем автоматические рекомендации по ставкам и отслеживаем окупаемость через Power BI.</p>

        <blockquote>
          <p>«Эксперименты нужно ставить быстро, но завершать вовремя — большинство провалов происходит из-за затянутых тестов.»</p>
          <cite>— Илья Михайлов, CEO НекстАналитика</cite>
        </blockquote>

        <p>Чтобы не упустить момент масштабирования, фиксируем контрольные точки: целевую долю рынка, допустимую убыточность на старте и KPI по запасам. Как только показатель достигнут, запускаем систему предупреждений в НекстАналитика и расширяем SKU.</p>
        """
        
        post, created = BlogPost.objects.get_or_create(
            slug='kak-ocenit-potencial-kategorii-na-wildberries-za-30-minut',
            defaults={
                'title': 'Как оценить потенциал категории на Wildberries за 30 минут',
                'category': category,
                'excerpt': 'Практические шаги по настройке Power BI и проверке данных маркетплейса.',
                'content': article_content.strip(),
                'author_name': 'Анна Ким',
                'reading_time': 7,
                'published_at': timezone.now() - timedelta(days=10),
                'is_published': True,
            }
        )
        
        # Создаем еще несколько статей для примера
        additional_posts = [
            {
                'slug': 'testirovanie-novyh-sku-na-ozon',
                'title': 'Тестируем новые SKU на Ozon без лишних рисков',
                'excerpt': 'Пошаговый план экспериментов с минимальным бюджетом и метриками успеха.',
                'content': '<p>Статья о тестировании новых SKU на Ozon...</p>',
                'author_name': 'Илья Михайлов',
                'reading_time': 10,
                'published_at': timezone.now() - timedelta(days=5),
            },
            {
                'slug': 'kontrol-marzhinalnosti-pri-masshtabirovanii',
                'title': 'Как контролировать маржинальность при масштабировании',
                'excerpt': 'Настройка дашбордов и алертов для финансовых команд.',
                'content': '<p>Статья о контроле маржинальности...</p>',
                'author_name': 'Анна Ким',
                'reading_time': 8,
                'published_at': timezone.now() - timedelta(days=3),
            },
            {
                'slug': 'sistema-bystroj-validacii-idej',
                'title': 'Система быстрой валидации идей в e-com',
                'excerpt': 'Инструменты для принятия решений на основе данных и обратной связи.',
                'content': '<p>Статья о валидации идей...</p>',
                'author_name': 'Илья Михайлов',
                'reading_time': 6,
                'published_at': timezone.now() - timedelta(days=1),
            },
        ]
        
        related_posts_list = []
        for post_data in additional_posts:
            related_post, _ = BlogPost.objects.get_or_create(
                slug=post_data['slug'],
                defaults={
                    'title': post_data['title'],
                    'category': category,
                    'excerpt': post_data['excerpt'],
                    'content': post_data['content'],
                    'author_name': post_data['author_name'],
                    'reading_time': post_data['reading_time'],
                    'published_at': post_data['published_at'],
                    'is_published': True,
                }
            )
            related_posts_list.append(related_post)
        
        # Создаем связанные статьи для основной статьи
        for idx, related_post in enumerate(related_posts_list[:3], 1):
            RelatedPost.objects.get_or_create(
                post=post,
                related_post=related_post,
                defaults={'order': idx}
            )
        
        self.stdout.write(self.style.SUCCESS('  [OK] Данные блога созданы'))

