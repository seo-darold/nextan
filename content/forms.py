from django import forms
from .models import ContactRequest


class ContactForm(forms.ModelForm):
    """Форма обратной связи"""
    
    class Meta:
        model = ContactRequest
        fields = ['name', 'email', 'company', 'comment']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form__input',
                'placeholder': 'Анна'
            }),
            'email': forms.EmailInput(attrs={
                'class': 'form__input',
                'placeholder': 'you@company.ru'
            }),
            'company': forms.TextInput(attrs={
                'class': 'form__input',
                'placeholder': 'Название'
            }),
            'comment': forms.Textarea(attrs={
                'class': 'form__textarea',
                'rows': 4,
                'placeholder': 'Опишите задачу'
            }),
        }
        labels = {
            'name': 'Имя',
            'email': 'Email',
            'company': 'Компания',
            'comment': 'Комментарий',
        }

