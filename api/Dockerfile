FROM php:8.5-fpm

ENV COMPOSER_ALLOW_SUPERUSER=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        unzip \
        curl \
        libicu-dev \
        libzip-dev \
        libpq-dev \
    && docker-php-ext-install pdo_pgsql intl zip \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --gid 1000 app \
    && useradd --uid 1000 --gid 1000 --create-home app

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY docker/php-fpm.d/zz-clear-env.conf /usr/local/etc/php-fpm.d/zz-clear-env.conf
COPY docker/php/conf.d/opcache.ini /usr/local/etc/php/conf.d/opcache.ini

RUN chmod +x /usr/local/bin/entrypoint.sh

WORKDIR /var/www/html

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm", "-F"]
