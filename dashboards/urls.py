from django.urls import path
from . import views

app_name = 'dashboards'

urlpatterns = [
    path('api/dashboards/', views.DashboardListAPIView.as_view(), name='api_dashboard_list'),
    path('api/price/calculate/', views.PriceCalculationAPIView.as_view(), name='api_price_calculate'),
]

