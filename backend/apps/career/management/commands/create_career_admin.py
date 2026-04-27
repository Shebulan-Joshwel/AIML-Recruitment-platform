from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create the Career Support Hub Specialist admin account in the database."

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            default="admin1",
            help="Login username for the Career Support Hub Specialist (default: admin1)",
        )
        parser.add_argument(
            "--email",
            default="careerhub.admin@aiml.local",
            help="Email address for the account (default: careerhub.admin@aiml.local)",
        )
        parser.add_argument(
            "--password",
            default="admin123",
            help="Password for the account (default: admin123)",
        )

    def handle(self, *args, **options):
        User = get_user_model()
        username = options["username"]
        email    = options["email"]
        password = options["password"]

        if User.objects.filter(name=username, role="ADMIN").exists():
            self.stdout.write(
                self.style.WARNING(
                    f'Career Support Hub Specialist "{username}" already exists — skipping.'
                )
            )
            return

        User.objects.create_user(
            email=email,
            password=password,
            name=username,
            role="ADMIN",
            is_staff=True,
        )
        self.stdout.write(
            self.style.SUCCESS(
                f'Career Support Hub Specialist created.\n'
                f'  Username : {username}\n'
                f'  Email    : {email}\n'
                f'  Login at : http://localhost:5173/career-admin/login'
            )
        )
