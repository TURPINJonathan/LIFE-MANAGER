SHELL := /bin/sh

DOCKER_COMPOSE ?= docker compose
PHP_SERVICE ?= php
EXEC_PHP ?= $(DOCKER_COMPOSE) exec -T $(PHP_SERVICE)

ifndef RUN_PHP
ifeq ($(wildcard /.dockerenv),)
RUN_PHP := $(DOCKER_COMPOSE) run --rm --no-deps --user 1000:1000 --entrypoint="" $(PHP_SERVICE)
else
RUN_PHP :=
endif
endif

ifndef CACHE_PHP
ifeq ($(wildcard /.dockerenv),)
CACHE_PHP := $(EXEC_PHP)
else
CACHE_PHP :=
endif
endif

EMAIL ?=
PASSWORD ?=
FIRST_NAME ?= Life
LAST_NAME ?= Manager

.PHONY: help up down ps logs shell install qa qa-fix cs cs-fix stan test migrate migration cache cache-clear cache-warm jwt-keys user db-create db-reset

help:
	@echo "Commandes API (à lancer depuis api/, dans WSL) :"
	@echo "  make up          Démarre PHP, nginx et PostgreSQL"
	@echo "  make down        Arrête la stack"
	@echo "  make ps          État des conteneurs"
	@echo "  make logs        Suit les logs"
	@echo "  make shell       Shell dans le conteneur PHP"
	@echo "  make install     composer install"
	@echo "  make qa          cs + phpstan"
	@echo "  make qa-fix      cs-fix puis phpstan"
	@echo "  make cs          php-cs-fixer en dry-run"
	@echo "  make cs-fix      applique php-cs-fixer"
	@echo "  make stan        phpstan"
	@echo "  make test        crée la base de test puis PHPUnit"
	@echo "  make migrate     applique les migrations"
	@echo "  make migration   génère une migration depuis le schéma"
	@echo "  make cache       vide puis réchauffe le cache"
	@echo "  make jwt-keys    génère la paire de clés Lexik"
	@echo "  make user        crée un admin (EMAIL= PASSWORD=)"
	@echo "  make db-create   crée les bases applicative et de test"
	@echo "  make db-reset    détruit la base, migre, ne crée pas d'utilisateur"

up:
	$(DOCKER_COMPOSE) up -d --build

down:
	$(DOCKER_COMPOSE) down

ps:
	$(DOCKER_COMPOSE) ps

logs:
	$(DOCKER_COMPOSE) logs -f

shell:
	$(DOCKER_COMPOSE) exec $(PHP_SERVICE) sh

install:
	$(RUN_PHP) composer install --prefer-dist --no-interaction

qa: cs stan

qa-fix: cs-fix stan

cs:
	$(RUN_PHP) composer cs-check

cs-fix:
	$(RUN_PHP) composer cs-fix

stan:
	$(CACHE_PHP) php bin/console cache:warmup --env=dev
	$(RUN_PHP) composer phpstan

test:
	$(DOCKER_COMPOSE) up -d database
	$(RUN_PHP) sh scripts/phpunit.sh

migrate:
	$(RUN_PHP) php bin/console doctrine:migrations:migrate --no-interaction

migration:
	$(RUN_PHP) php bin/console make:migration --formatted --no-interaction

cache-clear:
	$(CACHE_PHP) php bin/console cache:clear --no-warmup

cache-warm:
	$(CACHE_PHP) php bin/console cache:warmup

cache: cache-clear cache-warm

jwt-keys:
	$(RUN_PHP) php bin/console lexik:jwt:generate-keypair --skip-if-exists

user:
	@test -n "$(EMAIL)" || (echo "EMAIL est obligatoire. Exemple : make user EMAIL=turpin.j@hotmail.fr PASSWORD='ChangeMe123!'"; exit 1)
	@test -n "$(PASSWORD)" || (echo "PASSWORD est obligatoire (12 caractères minimum)."; exit 1)
	$(RUN_PHP) php bin/console security:user:create --no-interaction \
		--email="$(EMAIL)" \
		--password="$(PASSWORD)" \
		--first-name="$(FIRST_NAME)" \
		--last-name="$(LAST_NAME)" \
		--admin

db-create:
	$(DOCKER_COMPOSE) exec -T database psql -U lm -d life_manager -tc "SELECT 1 FROM pg_database WHERE datname = 'life_manager_test'" | grep -q 1 || \
		$(DOCKER_COMPOSE) exec -T database psql -U lm -d life_manager -c "CREATE DATABASE life_manager_test"

db-reset:
	@echo "Destructif : suppression de life_manager, puis migrations."
	$(DOCKER_COMPOSE) exec -T database psql -U lm -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'life_manager' AND pid <> pg_backend_pid();"
	$(DOCKER_COMPOSE) exec -T database dropdb -U lm --if-exists --force life_manager
	$(DOCKER_COMPOSE) exec -T database createdb -U lm life_manager
	$(MAKE) migrate
