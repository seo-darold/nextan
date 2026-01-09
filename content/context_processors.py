from .models import CompanyInfo


def company_info(request):
    """Добавляет информацию о компании в контекст всех шаблонов"""
    try:
        return {'company_info': CompanyInfo.objects.get(pk=1)}
    except CompanyInfo.DoesNotExist:
        return {'company_info': None}

