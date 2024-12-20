from django.urls import path
from . import views
from django.contrib.auth.decorators import login_required

urlpatterns = [
    path('', views.home, name='home'),
    path('incomes/', login_required(views.get_incomes), name='get_incomes'),
    path('expenses/', login_required(views.get_expenses), name='get_expenses'),
    path('register/', views.register, name='register'),
    path('dashboard/', login_required(views.dashboard), name='dashboard'),
    path('verify/<uidb64>/<token>/', views.verify, name='verify'),
    path('add_income/', login_required(views.add_income), name='add_income'),
    path('add_expense/', login_required(views.add_expense), name='add_expense'),
    path('add_expense_category/', login_required(views.add_expense_category), name='add_expense_category'),
    path('get_expense_categories/', login_required(views.get_expense_categories), name='get_expense_categories'),
    path('get_incomes_expenses_by_week/', views.get_incomes_expenses_by_week, name='get_incomes_expenses_by_week'),
    path('update_category_limit/<int:category_id>/', views.update_category_limit, name='update_category_limit'),
]