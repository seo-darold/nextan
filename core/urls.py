from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('register/', views.register_view, name='register'),
    path('api/check-auth/', views.check_auth_view, name='check_auth'),
    path('api/vk-id-prepare/', views.vk_id_prepare_view, name='vk_id_prepare'),
    path('api/vk-id-auth/', views.vk_id_auth_callback_view, name='vk_id_auth_callback'),
    path('auth/vk-id-callback/', views.vk_id_oauth_redirect_view, name='vk_id_oauth_redirect'),
    path('auth/vk-id-complete/', views.vk_id_auth_complete_view, name='vk_id_auth_complete'),
    path('password-reset/', views.password_reset_request_view, name='password_reset_request'),
    path('password-reset/<str:token>/', views.password_reset_confirm_view, name='password_reset_confirm'),
]

