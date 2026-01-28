from django.contrib import admin
from .models import BlogCategory, BlogPost, RelatedPost
from dashboards.admin_site import nextan_admin_site


class BlogCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}


class RelatedPostInline(admin.TabularInline):
    """Inline для связанных статей"""
    model = RelatedPost
    fk_name = 'post'
    extra = 0
    fields = ('related_post', 'order')
    ordering = ('order',)


class BlogPostAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'author_name', 'is_published', 'published_at', 'created_at')
    list_filter = ('is_published', 'category', 'published_at', 'created_at')
    search_fields = ('title', 'excerpt', 'content', 'author_name')
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ('created_at', 'updated_at')
    inlines = [RelatedPostInline]
    ordering = ('-published_at', '-created_at')
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('title', 'slug', 'category', 'author_name')
        }),
        ('Контент', {
            'fields': ('excerpt', 'content', 'image')
        }),
        ('Метаданные', {
            'fields': ('reading_time', 'published_at', 'is_published')
        }),
        ('SEO', {
            'fields': ('meta_title', 'meta_description'),
            'classes': ('collapse',)
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


class RelatedPostAdmin(admin.ModelAdmin):
    list_display = ('post', 'related_post', 'order')
    list_filter = ('post',)
    search_fields = ('post__title', 'related_post__title')
    ordering = ('post', 'order')


# Регистрируем на кастомном admin site
nextan_admin_site.register(BlogCategory, BlogCategoryAdmin)
nextan_admin_site.register(BlogPost, BlogPostAdmin)
nextan_admin_site.register(RelatedPost, RelatedPostAdmin)
