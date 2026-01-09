# content/urls.py

from django.urls import path
from . import views

app_name = 'content'

urlpatterns = [
    path('', views.IndexView.as_view(), name='index'),
    path('about/', views.AboutView.as_view(), name='about'),
    path('contacts/', views.ContactsView.as_view(), name='contacts'),
    path('contacts/submit/', views.ContactFormView.as_view(), name='contact_submit'),

    # === Новые страницы ===
    path('account/', views.AccountView.as_view(), name='account'),
    path('cabinet/', views.CabinetView.as_view(), name='cabinet'),
    path('cabinet/cabinet-detail/', views.CabinetDetailView.as_view(), name='cabinet_detail'),
    path('dashboard/', views.DashboardView.as_view(), name='dashboard'),
    path('payments/', views.PaymentsView.as_view(), name='payments'),
    path('subscription/', views.SubscriptionView.as_view(), name='subscription'),
    path('support/', views.SupportView.as_view(), name='support'),
    path('support/support-ticket/', views.SupportTicketView.as_view(), name='support_ticket'),
]