FROM php:8.3-apache

# Install SQLite dev libs before enabling PDO SQLite
RUN apt-get update && apt-get install -y \
    libsqlite3-dev \
    && docker-php-ext-install pdo pdo_sqlite \
    && rm -rf /var/lib/apt/lists/*

# Create a dedicated writable folder for SQLite DB
RUN mkdir -p /var/www \
    && chown -R www-data:www-data /var/www \
    && chmod -R 775 /var/www

# Copy app code
COPY . /var/www/html/

# Give write permission for uploaded files or temp data
RUN chown -R www-data:www-data /var/www/html && chmod -R 775 /var/www/html

# Enable Apache mod_rewrite (optional)
RUN a2enmod rewrite
