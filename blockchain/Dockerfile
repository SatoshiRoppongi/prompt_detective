# FROM --platform=linux/amd64 ubuntu:focal

FROM rust:latest
WORKDIR /usr/src/app
COPY . .

RUN cd /usr/src/app

# solana開発のために必要
# RUN apt-get update && apt-get install -y libssl-dev
# RUN sh -c "$(curl -sSfL https://release.solana.com/v1.6.6/install)"
RUN sh -c "$(curl -sSfL https://release.solana.com/v1.18.15/install)"

# Rustの環境構築
RUN sh -c "$(rustup component add rls rust-analysis rust-src)"
RUN sh -c "$(cargo install cargo-edit)"

# solanaのPATHを通す
RUN sh -c "$(export PATH='/root/.local/share/solana/install/active_release/bin:$PATH':$PATH)"
