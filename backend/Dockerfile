FROM python:3.11-slim

ARG TYPST_VERSION=0.14.2

# System fonts: same set used by the upstream renderer so output is byte-identical.
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    unzip \
    xz-utils \
    antiword \
    fontconfig \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-unifont \
    fonts-roboto \
    fonts-noto-core \
    fonts-vazirmatn \
    && rm -rf /var/lib/apt/lists/*

# Pinned Typst binary.
RUN curl -fsSL "https://github.com/typst/typst/releases/download/v${TYPST_VERSION}/typst-x86_64-unknown-linux-musl.tar.xz" \
    -o /tmp/typst.tar.xz && \
    tar -xJf /tmp/typst.tar.xz -C /tmp && \
    install -m 0755 /tmp/typst-x86_64-unknown-linux-musl/typst /usr/local/bin/typst && \
    rm -rf /tmp/typst.tar.xz /tmp/typst-x86_64-unknown-linux-musl

# Inter (.ttc - full family), Source Sans 3, FontAwesome 6.
RUN mkdir -p /usr/share/fonts/inter /usr/share/fonts/source-sans /usr/share/fonts/fontawesome && \
    curl -fsSL -o /tmp/inter.zip https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip && \
    unzip -q /tmp/inter.zip -d /tmp/inter && \
    cp /tmp/inter/Inter.ttc /usr/share/fonts/inter/ && \
    curl -fsSL -L -o /tmp/ss3.zip https://github.com/adobe-fonts/source-sans/releases/download/3.052R/TTF-source-sans-3.052R.zip && \
    unzip -q /tmp/ss3.zip -d /tmp/ss3 && \
    find /tmp/ss3 -name '*.ttf' -exec cp {} /usr/share/fonts/source-sans/ \; && \
    curl -fsSL -o /tmp/fa.zip https://use.fontawesome.com/releases/v6.7.2/fontawesome-free-6.7.2-desktop.zip && \
    unzip -q /tmp/fa.zip -d /tmp/fa && \
    find /tmp/fa -name '*.otf' -exec cp {} /usr/share/fonts/fontawesome/ \; && \
    fc-cache -f && \
    rm -rf /tmp/inter.zip /tmp/ss3.zip /tmp/fa.zip /tmp/inter /tmp/ss3 /tmp/fa

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
