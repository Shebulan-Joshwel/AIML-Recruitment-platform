from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('career', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='careerresource',
            name='image',
            field=models.ImageField(blank=True, null=True, upload_to='career/resources/'),
        ),
    ]
