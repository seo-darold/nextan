from django.db import models
from django.urls import reverse
from django.utils.text import slugify


class BlogCategory(models.Model):
    """Категории блога"""
    name = models.CharField(max_length=100, verbose_name='Название категории')
    slug = models.SlugField(max_length=100, unique=True, verbose_name='URL-слаг')
    is_active = models.BooleanField(default=True, verbose_name='Активна')

    class Meta:
        verbose_name = 'Категория блога'
        verbose_name_plural = 'Категории блога'
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class BlogPost(models.Model):
    """Статьи блога"""
    title = models.CharField(max_length=300, verbose_name='Заголовок')
    slug = models.SlugField(max_length=300, unique=True, verbose_name='URL-слаг')
    category = models.ForeignKey(
        BlogCategory, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        verbose_name='Категория'
    )
    excerpt = models.TextField(verbose_name='Краткое описание')
    content = models.TextField(verbose_name='Полный контент статьи (HTML)')
    author_name = models.CharField(max_length=100, verbose_name='Имя автора')
    reading_time = models.IntegerField(verbose_name='Время чтения в минутах')
    published_at = models.DateTimeField(verbose_name='Дата публикации')
    is_published = models.BooleanField(default=False, verbose_name='Опубликована')
    image = models.ImageField(upload_to='blog/', blank=True, null=True, verbose_name='Изображение')
    meta_title = models.CharField(max_length=300, blank=True, verbose_name='SEO заголовок')
    meta_description = models.CharField(max_length=500, blank=True, verbose_name='SEO описание')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создана')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлена')

    class Meta:
        verbose_name = 'Статья блога'
        verbose_name_plural = 'Статьи блога'
        ordering = ['-published_at', '-created_at']

    def __str__(self):
        return self.title

    def get_absolute_url(self):
        return reverse('blog:post_detail', kwargs={'slug': self.slug})

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)


class RelatedPost(models.Model):
    """Связанные статьи"""
    post = models.ForeignKey(
        BlogPost, 
        on_delete=models.CASCADE, 
        related_name='related_posts',
        verbose_name='Основная статья'
    )
    related_post = models.ForeignKey(
        BlogPost, 
        on_delete=models.CASCADE, 
        related_name='related_to_posts',
        verbose_name='Связанная статья'
    )
    order = models.IntegerField(default=0, verbose_name='Порядок отображения')

    class Meta:
        verbose_name = 'Связанная статья'
        verbose_name_plural = 'Связанные статьи'
        ordering = ['post', 'order']
        unique_together = [['post', 'related_post']]

    def __str__(self):
        return f"{self.post.title} → {self.related_post.title}"
