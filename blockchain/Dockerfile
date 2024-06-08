FROM rust:latest
WORKDIR /usr/src/app

# 必要なファイルのみコピー
COPY blockchain .

RUN apt-get update && apt-get install -y curl procps

# Solanaのインストール
RUN sh -c "$(curl -sSfL https://release.solana.com/v1.18.15/install)"

# Rustの環境構築
RUN rustup component add rls rust-analysis rust-src
RUN cargo install cargo-edit

# SolanaのPATHを通す
ENV PATH="/root/.local/share/solana/install/active_release/bin:$PATH"

# Solanaのバージョン確認
RUN solana --version

# anchorのインストール
# RUN cargo install --git https://github.com/coral-xyz/anchor avm --locked --force && avm install && avm use latest
