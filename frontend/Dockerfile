# cf. https://qiita.com/asip2k25/items/89160407ca65ef17e9f1
FROM node:18-slim

ENV TZ Asia/Tokyo

WORKDIR /frontend

# Yarnの公式リポジトリを追加する
RUN apt-get update && \
    apt-get install -y gnupg && \
    apt-key adv --fetch-keys http://dl.yarnpkg.com/debian/pubkey.gpg && \
    echo "deb http://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
    apt-get update

RUN apt-get install -y yarn

COPY . /frontend

RUN rm -rf .git/
RUN rm -rf node_modules

# RUN pnpm install
RUN yarn

# RUN npx nuxi upgrade --force

# EXPOSE 3000
# EXPOSE 24678

# CMD ["pnpm", "dev"]
