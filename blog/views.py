from django.views.generic import ListView, DetailView
from .models import BlogPost, BlogCategory


class BlogListView(ListView):
    """Список статей блога"""
    model = BlogPost
    template_name = 'blog/blog_list.html'
    context_object_name = 'posts'
    paginate_by = 12
    
    def get_queryset(self):
        queryset = BlogPost.objects.filter(is_published=True)
        category_slug = self.request.GET.get('category')
        if category_slug:
            try:
                category = BlogCategory.objects.get(slug=category_slug, is_active=True)
                queryset = queryset.filter(category=category)
            except BlogCategory.DoesNotExist:
                pass
        return queryset.select_related('category')
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['categories'] = BlogCategory.objects.filter(is_active=True)
        return context


class BlogPostDetailView(DetailView):
    """Детальная страница статьи"""
    model = BlogPost
    template_name = 'blog/blog_post_detail.html'
    context_object_name = 'post'
    slug_field = 'slug'
    slug_url_kwarg = 'slug'
    
    def get_queryset(self):
        return BlogPost.objects.filter(is_published=True).select_related('category')
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Получаем связанные статьи
        related_posts = self.object.related_posts.select_related('related_post').order_by('order')[:3]
        context['related_posts'] = [rp.related_post for rp in related_posts if rp.related_post.is_published]
        return context
