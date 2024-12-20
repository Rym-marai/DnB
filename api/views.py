from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate
from django.contrib.auth.forms import UserCreationForm
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.core.mail import send_mail, EmailMessage
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.template.loader import render_to_string
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.models import User
from django.conf import settings
from .models import Income, Expense, ExpenseCategory, CategoryProgress
import logging
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
import json
from django.contrib.auth.decorators import login_required
from datetime import timedelta
from django.utils import timezone
from django.urls import reverse
from django.views.decorators.http import require_http_methods

logger = logging.getLogger(__name__)

def home(request):
    return render(request, 'registration/login.html')

def dashboard(request):
    return render(request, 'index.html')

@csrf_protect
def register(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.is_active = False  # Deactivate account until it is verified
            user.first_name = request.POST.get('first_name')
            user.last_name = request.POST.get('last_name')
            user.email = request.POST.get('email')
            user.save()
            send_verification_email(request, user)
            return render(request, 'registration/login.html', {'message': 'Please check your email to verify your account.'})
        else:
            print(form.errors)  # Debugging: Print form errors to the console
            return render(request, 'registration/login.html', {'form': form, 'error': 'Form is not valid'})
    else:
        form = UserCreationForm()
    return render(request, 'registration/login.html', {'form': form})

def send_verification_email(request, user):
    token = default_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    verification_link = request.build_absolute_uri(f'/verify/{uid}/{token}/')
    subject = 'Verify your Danouci account'
    message = render_to_string('registration/verification_email.html', {
        'user': user,
        'verification_link': verification_link,
    })
    logger.debug(f"Sending verification email to {user.email} with link {verification_link}")
    try:
        email = EmailMessage(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email])
        email.content_subtype = "html"  # Set the email content to HTML
        email.send()
        logger.info(f"Verification email sent to {user.email}")
    except Exception as e:
        logger.error(f"Error sending verification email: {e}")

def verify(request, uidb64, token):
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if user is not None and default_token_generator.check_token(user, token):
        user.is_active = True
        user.save()
        return redirect('home')
    else:
        return render(request, 'registration/login.html', {'error': 'Verification link is invalid!'})

@csrf_exempt
@require_POST
@login_required
def add_income(request):
    data = json.loads(request.body)
    title = data.get('title')
    amount = data.get('amount')
    category = data.get('category')
    date = data.get('date')
    comment = data.get('comment')

    income = Income(user=request.user, title=title, amount=amount, category=category, date=date, comment=comment)
    income.save()

    return JsonResponse({'message': 'Income added successfully'}, status=201)

@csrf_protect
@require_POST
@login_required
def add_expense(request):
    try:
        data = json.loads(request.body)
        logger.debug(f"Received data for adding expense: {data}")  # Add logging
        title = data.get('title')
        amount = data.get('amount')
        category_name = data.get('category')
        date = data.get('date')
        comment = data.get('comment')

        category = ExpenseCategory.objects.get(user=request.user, name=category_name)
        expense = Expense(user=request.user, title=title, amount=amount, category=category_name, date=date, comment=comment)
        expense.save()

        # Update category progress
        progress, created = CategoryProgress.objects.get_or_create(user=request.user, category=category)
        progress.current_expense += amount
        progress.save()

        if progress.current_expense >= category.max_limit:
            send_max_limit_email(request, request.user, category)

        logger.info(f"Expense added successfully: {expense}")  # Add logging
        return JsonResponse({'message': 'Expense added successfully'}, status=201)
    except Exception as e:
        logger.error(f"Error adding expense: {e}")
        return JsonResponse({'error': 'An error occurred while adding the expense.'}, status=500)

@csrf_protect
@require_POST
@login_required
def add_expense_category(request):
    try:
        data = json.loads(request.body)
        name = data.get('name')
        max_limit = data.get('max_limit')

        category = ExpenseCategory(user=request.user, name=name, max_limit=max_limit)
        category.save()

        return JsonResponse({'message': 'Expense category added successfully'}, status=201)
    except Exception as e:
        logger.error(f"Error adding expense category: {e}")
        return JsonResponse({'error': 'An error occurred while adding the expense category.'}, status=500)

@login_required
def get_expense_categories(request):
    try:
        categories = ExpenseCategory.objects.filter(user=request.user)
        category_progress = CategoryProgress.objects.filter(user=request.user)
        response_data = []

        for category in categories:
            progress = category_progress.filter(category=category).first()
            current_expense = progress.current_expense if progress else 0
            response_data.append({
                'name': category.name,
                'max_limit': category.max_limit,
                'current_expense': current_expense
            })

        return JsonResponse(response_data, safe=False)
    except Exception as e:
        logger.error(f"Error fetching expense categories: {e}")
        return JsonResponse({'error': 'An error occurred while fetching the expense categories.'}, status=500)

@login_required
def get_incomes(request):
    incomes = Income.objects.filter(user=request.user)
    return JsonResponse(list(incomes.values()), safe=False)

@login_required
def get_expenses(request):
    try:
        expenses = Expense.objects.filter(user=request.user)
        logger.debug(f"Fetched expenses: {list(expenses.values())}")  # Add logging
        return JsonResponse(list(expenses.values()), safe=False)
    except Exception as e:
        logger.error(f"Error fetching expenses: {e}")
        return JsonResponse({'error': 'An error occurred while fetching the expenses.'}, status=500)

@login_required
def get_incomes_expenses_by_week(request):
    try:
        today = timezone.now().date()
        start_of_month = today.replace(day=1)
        end_of_month = (start_of_month + timedelta(days=32)).replace(day=1) - timedelta(days=1)

        incomes = Income.objects.filter(user=request.user, date__range=[start_of_month, end_of_month])
        expenses = Expense.objects.filter(user=request.user, date__range=[start_of_month, end_of_month])

        weeks = []
        current_week_start = start_of_month
        while current_week_start <= end_of_month:
            current_week_end = current_week_start + timedelta(days=6)
            if current_week_end > end_of_month:
                current_week_end = end_of_month
            weeks.append((current_week_start, current_week_end))
            current_week_start = current_week_end + timedelta(days=1)

        weekly_data = {
            'labels': [f"Week {i+1}" for i in range(len(weeks))],
            'incomes': [0] * len(weeks),
            'expenses': [0] * len(weeks)
        }

        for income in incomes:
            for i, (week_start, week_end) in enumerate(weeks):
                if week_start <= income.date <= week_end:
                    weekly_data['incomes'][i] += income.amount
                    break

        for expense in expenses:
            for i, (week_start, week_end) in enumerate(weeks):
                if week_start <= expense.date <= week_end:
                    weekly_data['expenses'][i] += expense.amount
                    break

        return JsonResponse(weekly_data, safe=False)
    except Exception as e:
        logger.error(f"Error fetching weekly income and expenses: {e}")
        return JsonResponse({'error': 'An error occurred while fetching the weekly income and expenses.'}, status=500)

def send_max_limit_email(request, user, category):
    subject = f"Max Limit Reached for {category.name}"
    update_link = request.build_absolute_uri(reverse('update_category_limit', args=[category.id]))
    message = render_to_string('emails/max_limit_reached.html', {
        'user': user,
        'category': category,
        'update_link': update_link,
    })
    try:
        email = EmailMessage(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email])
        email.content_subtype = "html"
        email.send()
        logger.info(f"Max limit email sent to {user.email} for category {category.name}")
    except Exception as e:
        logger.error(f"Error sending max limit email: {e}")

@require_http_methods(["GET", "POST"])
@login_required
def update_category_limit(request, category_id):
    category = ExpenseCategory.objects.get(id=category_id, user=request.user)
    if request.method == 'POST':
        new_limit = request.POST.get('new_limit')
        if new_limit:
            category.max_limit = new_limit
            category.save()
            # Keep the old expenses
            progress = CategoryProgress.objects.get(user=request.user, category=category)
            progress.current_expense = progress.current_expense  # Keep the old expenses
            progress.save()
            return redirect('dashboard')
    return render(request, 'update_category_limit.html', {'category': category})
