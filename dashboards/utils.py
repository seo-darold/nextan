from decimal import Decimal
from .models import DiscountRule


def calculate_price_with_discounts(
    dashboard, 
    marketplaces_count, 
    cabinets_count, 
    months,
    max_total_discount=50.0
):
    """
    Рассчитывает цену с учётом всех применимых скидок.
    
    Args:
        dashboard: Экземпляр модели Dashboard
        marketplaces_count: Количество выбранных маркетплейсов
        cabinets_count: Количество кабинетов
        months: Количество месяцев
        max_total_discount: Максимальная суммарная скидка в процентах (по умолчанию 50%)
    
    Returns:
        dict: {
            'base_price_per_month': Decimal,
            'price_per_month_after_discount': Decimal,
            'applied_discounts': list,
            'total_discount_percent': Decimal,
            'total_price': Decimal,
            'savings': Decimal
        }
    """
    # 1. Базовая цена за месяц
    base_price_per_month = dashboard.base_price * marketplaces_count * cabinets_count
    
    # 2. Найти все применимые скидки
    applied_discounts = []
    total_discount_percent = Decimal('0.00')
    
    discount_rules = DiscountRule.objects.filter(
        dashboard=dashboard,
        is_active=True
    ).order_by('order', 'id')
    
    for rule in discount_rules:
        is_applicable = False
        
        if rule.discount_type == 'months' and months >= rule.min_value:
            is_applicable = True
        elif rule.discount_type == 'cabinets' and cabinets_count >= rule.min_value:
            is_applicable = True
        elif rule.discount_type == 'marketplaces' and marketplaces_count >= rule.min_value:
            is_applicable = True
        
        if is_applicable:
            applied_discounts.append({
                'type': rule.discount_type,
                'min_value': rule.min_value,
                'discount_percent': float(rule.discount_percent),
                'description': rule.description or f"Скидка {rule.discount_percent}%"
            })
            total_discount_percent += rule.discount_percent
    
    # 3. Ограничить суммарную скидку
    max_discount_decimal = Decimal(str(max_total_discount))
    total_discount_percent = min(total_discount_percent, max_discount_decimal)
    
    # 4. Рассчитать цену со скидкой
    discount_multiplier = Decimal('1.00') - (total_discount_percent / Decimal('100.00'))
    price_per_month_after_discount = base_price_per_month * discount_multiplier
    
    # 5. Итоговая цена
    total_price = price_per_month_after_discount * Decimal(str(months))
    savings = (base_price_per_month * Decimal(str(months))) - total_price
    
    return {
        'base_price_per_month': base_price_per_month,
        'price_per_month_after_discount': price_per_month_after_discount,
        'applied_discounts': applied_discounts,
        'total_discount_percent': total_discount_percent,
        'total_price': total_price,
        'savings': savings
    }

