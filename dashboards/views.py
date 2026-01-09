from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Dashboard, Marketplace
from .utils import calculate_price_with_discounts


class DashboardListAPIView(APIView):
    """API для получения списка дашбордов"""
    
    def get(self, request):
        dashboards = Dashboard.objects.filter(is_active=True).order_by('order', 'title')
        data = []
        for dashboard in dashboards:
            # Получаем доступные скидки для дашборда
            discount_rules = dashboard.discount_rules.filter(is_active=True)
            available_discounts = [
                {
                    'type': rule.discount_type,
                    'min_value': rule.min_value,
                    'discount_percent': float(rule.discount_percent),
                    'description': rule.description or f"Скидка {rule.discount_percent}%"
                }
                for rule in discount_rules
            ]
            
            data.append({
                'id': dashboard.id,
                'title': dashboard.title,
                'subtitle': dashboard.subtitle,
                'base_price': float(dashboard.base_price),
                'preview': dashboard.preview or '',
                'image': dashboard.image.url if dashboard.image else None,
                'description': dashboard.description,
                'details': dashboard.details,
                'available_discounts': available_discounts,
            })
        
        return Response(data)


class PriceCalculationAPIView(APIView):
    """API для расчета цены с учетом скидок"""
    
    def post(self, request):
        dashboard_id = request.data.get('dashboard_id')
        marketplaces = request.data.get('marketplaces', [])
        cabinets_count = request.data.get('cabinets_count', 1)
        months = request.data.get('months', 1)
        
        # Валидация
        if not dashboard_id:
            return Response(
                {'error': 'dashboard_id обязателен'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not marketplaces or not isinstance(marketplaces, list):
            return Response(
                {'error': 'marketplaces должен быть непустым списком'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if cabinets_count < 1:
            return Response(
                {'error': 'cabinets_count должен быть >= 1'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if months < 1:
            return Response(
                {'error': 'months должен быть >= 1'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            dashboard = Dashboard.objects.get(id=dashboard_id, is_active=True)
        except Dashboard.DoesNotExist:
            return Response(
                {'error': 'Дашборд не найден'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Расчет цены
        marketplaces_count = len(marketplaces)
        price_data = calculate_price_with_discounts(
            dashboard=dashboard,
            marketplaces_count=marketplaces_count,
            cabinets_count=cabinets_count,
            months=months
        )
        
        # Форматируем ответ
        response_data = {
            'base_price': float(dashboard.base_price),
            'price_per_month_before_discount': float(price_data['base_price_per_month']),
            'applied_discounts': price_data['applied_discounts'],
            'total_discount_percent': float(price_data['total_discount_percent']),
            'price_per_month_after_discount': float(price_data['price_per_month_after_discount']),
            'total_price': float(price_data['total_price']),
            'savings': float(price_data['savings']),
        }
        
        return Response(response_data)
