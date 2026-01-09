# content/views.py

from django.shortcuts import render
from django.views.generic import TemplateView, FormView
from django.urls import reverse_lazy
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from .models import (
    Persona, ProcessStep, SchemeFlow, Benefit, 
    SocialProofMetric, FAQ, CompanyInfo
)
from .forms import ContactForm


def get_company_info():
    """Получает информацию о компании (синглтон)"""
    try:
        return CompanyInfo.objects.get(pk=1)
    except CompanyInfo.DoesNotExist:
        return None


class IndexView(TemplateView):
    """Главная страница"""
    template_name = 'content/index.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update({
            'company_info': get_company_info(),
            'personas': Persona.objects.filter(is_active=True),
            'process_steps': ProcessStep.objects.all(),
            'scheme_flows': SchemeFlow.objects.all(),
            'benefits': Benefit.objects.filter(is_active=True),
            'metrics': SocialProofMetric.objects.filter(is_active=True),
            'faqs': FAQ.objects.filter(is_active=True),
        })
        return context


class AboutView(TemplateView):
    """Страница "О нас" """
    template_name = 'content/about.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['company_info'] = get_company_info()
        return context


class ContactsView(TemplateView):
    """Страница контактов"""
    template_name = 'content/contacts.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['company_info'] = get_company_info()
        context['form'] = ContactForm()
        return context


class ContactFormView(FormView):
    """Обработка формы обратной связи"""
    form_class = ContactForm
    template_name = 'content/contacts.html'
    success_url = reverse_lazy('content:contacts')
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['company_info'] = get_company_info()
        return context
    
    def form_valid(self, form):
        form.save()
        # Если запрос через AJAX, возвращаем JSON
        if self.request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'message': 'Сообщение успешно отправлено!'
            })
        messages.success(self.request, 'Спасибо! Ваше сообщение отправлено. Мы свяжемся с вами в ближайшее время.')
        return super().form_valid(form)
    
    def form_invalid(self, form):
        # Если запрос через AJAX, возвращаем JSON с ошибками
        if self.request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'errors': form.errors
            }, status=400)
        messages.error(self.request, 'Пожалуйста, исправьте ошибки в форме.')
        return super().form_invalid(form)


# === Новые простые представления ===

class AccountView(TemplateView):
    template_name = 'content/account.html'


class CabinetDetailView(TemplateView):
    template_name = 'content/cabinet-detail.html'


class CabinetView(TemplateView):
    template_name = 'content/cabinet.html'


class DashboardView(TemplateView):
    template_name = 'content/dashboard.html'


class PaymentsView(TemplateView):
    template_name = 'content/payments.html'


class SubscriptionView(TemplateView):
    template_name = 'content/subscription.html'


class SupportTicketView(TemplateView):
    template_name = 'content/support-ticket.html'


class SupportView(TemplateView):
    template_name = 'content/support.html'