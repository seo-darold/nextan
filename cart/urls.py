from django.urls import path
from . import views
from . import api_views

app_name = 'cart'

urlpatterns = [
    path('', views.CartView.as_view(), name='cart'),
    # API endpoints
    path('api/', api_views.CartAPIView.as_view(), name='api_cart'),
    path('api/clear/', api_views.CartClearAPIView.as_view(), name='api_cart_clear'),
    path('api/total/', api_views.CartTotalAPIView.as_view(), name='api_cart_total'),
    path('api/item/<int:item_id>/', api_views.CartAPIView.as_view(), name='api_cart_item'),
]

