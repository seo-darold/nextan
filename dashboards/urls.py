from django.urls import path
from . import views

app_name = 'dashboards'

urlpatterns = [
    # API для дашбордов
    path('api/dashboards/', views.DashboardListAPIView.as_view(), name='api_dashboard_list'),
    path('api/price/calculate/', views.PriceCalculationAPIView.as_view(), name='api_price_calculate'),
    
    # API для личного кабинета
    path('api/personal-data/', views.PersonalDataAPIView.as_view(), name='api_personal_data'),
    path('api/account-balance/', views.AccountBalanceAPIView.as_view(), name='api_account_balance'),
    path('api/balance/topup/', views.BalanceTopUpAPIView.as_view(), name='api_balance_topup'),
    
    # API для кабинетов
    path('api/cabinets/', views.CabinetListAPIView.as_view(), name='api_cabinet_list'),
    path('api/cabinets/<int:cabinet_id>/', views.CabinetDetailAPIView.as_view(), name='api_cabinet_detail'),
    
    # API для подписок
    path('api/subscriptions/', views.SubscriptionListAPIView.as_view(), name='api_subscription_list'),
    
    # API для платежей
    path('api/payments/', views.PaymentListAPIView.as_view(), name='api_payment_list'),
    
    # API для тикетов
    path('api/tickets/', views.TicketListAPIView.as_view(), name='api_ticket_list'),
    path('api/tickets/<int:ticket_id>/', views.TicketDetailAPIView.as_view(), name='api_ticket_detail'),
]

