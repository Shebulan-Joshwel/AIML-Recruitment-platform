"""
Serializers for auth API: login, register, me.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["user_id", "name", "email", "role", "created_at"]
        read_only_fields = ["user_id", "role", "created_at"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(choices=["CANDIDATE", "RECRUITER"], default="CANDIDATE")

    class Meta:
        model = User
        fields = ["name", "email", "password", "role"]

    def create(self, validated_data):
        role = validated_data.get("role", "CANDIDATE")
        if role not in ("CANDIDATE", "RECRUITER"):
            role = "CANDIDATE"
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            name=validated_data["name"],
            role=role,
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
