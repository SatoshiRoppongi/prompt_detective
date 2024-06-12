# cf. https://qiita.com/asip2k25/items/89160407ca65ef17e9f1
FROM node:18-slim

ENV TZ Asia/Tokyo

WORKDIR /frontend

# Yarnの公式リポジトリを追加する
# RUN apt-get update && \
#     apt-get install -y gnupg && \
#     apt-key adv --fetch-keys http://dl.yarnpkg.com/debian/pubkey.gpg && \
#     echo "deb http://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
#     apt-get update

# 必要なパッケージのインストールとYarnの設定
RUN apt-get update && \
    apt-get install -y gnupg curl && \
    curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
    echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
    apt-get update && \
    apt-get install -y yarn && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# RUN apt-get install -y yarn

COPY . .

RUN rm -rf .git node_modules

RUN yarn install

EXPOSE 3000

CMD ["yarn", "dev"]