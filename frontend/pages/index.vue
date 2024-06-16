<template>
  <v-app>
    <v-app-bar app>
      <v-toolbar-title>プロンプト探偵</v-toolbar-title>
      <v-spacer></v-spacer>
      <connectWalletButton />
    </v-app-bar>
    <v-main>
      <v-container>
        <v-row>
          <v-col cols="12">
            <h1>画像を生成する元となった文章を当てよう!</h1>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="3">
            <v-card>
              <v-card-title>Advertisement</v-card-title>
              <v-card-text>
                <!-- Advertisement content -->
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6">
            <v-container>
              <v-row>
                <v-col>
                  <div class="custom-textarea">
                    <v-form @submit.prevent="openModal">
                      <v-textarea
                        outlined
                        name="prompt-guessing"
                        label="プロンプト"
                        v-model="promptString"
                        hint="文字数は50文字以下です"
                        counter
                        clearable
                        ref="textareaRef"
                        @focus="handleFocus"
                        @blur="handleBlur"
                      >
                        <template v-slot:append>
                          <transition name="fade">
                            <div
                              v-if="!focused && !promptString"
                              class="overlay"
                              @click="focusTextarea"
                            >
                              <v-icon large>{{ mdiHelp }}</v-icon>
                              <div>ここをクリックしてください</div>
                            </div>
                          </transition>
                        </template>
                      </v-textarea>
                      <div class="d-flex justify-end">
                        <v-btn type="submit" :disabled="!promptString"
                          >送信確認</v-btn
                        >
                      </div>
                    </v-form>
                  </div>
                </v-col>
              </v-row>
              <v-row justify="center">
                <v-icon large class="arrow-down">{{
                  mdiArrowDownThick
                }}</v-icon>
              </v-row>
              <v-row>
                <v-col>
                  <v-img
                    v-if="!isLoading && !errorMessage"
                    :src="imageUrl"
                    width="100%"
                  ></v-img>
                  <v-alert v-if="errorMessage" type="error">
                    {{ errorMessage }}
                  </v-alert>
                  <v-progress-circular
                    v-if="isLoading"
                    indeterminate
                    color="primary"
                  ></v-progress-circular>
                </v-col>
              </v-row>
            </v-container>
          </v-col>
          <v-col cols="3">
            <v-card>
              <v-card-title>Summary Information</v-card-title>
              <v-card-text>
                <!-- Summary and details about the image -->
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <v-dialog v-model="showDialog" persistent max-width="600px">
      <v-card>
        <v-card-title>
          <span class="text-h5">この内容で確定する</span>
        </v-card-title>
        <v-card-text>
          <div>あなたが予想したプロンプト</div>
          <v-textarea disabled v-model="promptString"> </v-textarea>
          <v-form>
            <div>送信するSOL</div>
            <v-text-field
              label="桁数を間違えないようにご注意ください"
              v-model="additionalInfo1"
              suffix="SOL"
            ></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="green darken-1" text @click="submitAdditionalInfo"
            >確定</v-btn
          >
          <v-btn color="green darken-1" text @click="closeModal"
            >キャンセル</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>


<script setup lang="ts">
import { ref, nextTick } from "vue";
import { useRuntimeConfig } from "#app";
import { mdiHelp, mdiArrowDownThick } from "@mdi/js";

import connectWalletButton from "~/components/ConnectWalletButton";

const input = ref("");
const promptString = ref("");
const focused = ref(false);
const textareaRef = ref(null);
const showDialog = ref(false);
const additionalInfo1 = ref("");
const imageUrl = ref("");  // 画像URLを保持するref
const isLoading = ref(true); // ローディング状態を保持するref
const errorMessage = ref(""); // エラーメッセージを保持するref


const handleFocus = () => {
  focused.value = true;
};

const handleBlur = () => {
  focused.value = false;
};

const focusTextarea = () => {
  focused.value = true;
  nextTick(() => {
    textareaRef.value.focus();
  });
};

const openModal = () => {
  showDialog.value = true;
};

const closeModal = () => {
  showDialog.value = false;
};

const config = useRuntimeConfig();
const apiBaseUrl = config.public.apiBaseUrl;
const apiUrl = `${apiBaseUrl}/prompt-detective-backend/us-central1/api`


// 画像URLを取得する関数


const fetchImageUrl = async () => {
  try {
    const { data, error } = await useFetch(`${apiUrl}/image`);
    if (error.value) {
      throw new Error(error.value.message);
    }

    // デバッグ用にレスポンスデータをログに出力
    console.log("APIレスポンスデータ:", data.value);

    if (data.value && data.value.url) {
      imageUrl.value = data.value.url; // 取得した画像URLをセット
    } else {
      throw new Error("レスポンスにurlプロパティがありません");
    }
  } catch (error) {
    console.error("Error fetching image URL:", error);
    errorMessage.value = "画像を取得できませんでした。";
  } finally {
    isLoading.value = false; // ローディング状態を解除
  }
};



// コンポーネントがマウントされたときに画像URLを取得
onMounted(fetchImageUrl);

const submitAdditionalInfo = async () => {
  console.log("Form submitted with input:", input.value);
  console.log("Additional Info 1:", additionalInfo1.value);
  console.log("Additional Info 2:", additionalInfo2.value);
  console.log("apiBaseUrl", apiBaseUrl);

  try {
    const info = {
      promptString: promptString.value,
      additionalInfo1: additionalInfo1.value,
      additionalInfo2: additionalInfo2.value,
      publicKey,
      lamports,
    };
    const response = await $fetch(`${apiBaseUrl}/some`, {
      method: "POST",
      body: info,
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    closeModal();
  }
};

const requestAirdropWithRetry = async (
  publicKey,
  lamports,
  retries = 5,
  delay = 500
) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempt ${i + 1}: Requesting airdrop...`);
      // Mocked airdrop request logic
      return;
    } catch (e) {
      if (i < retries - 1) {
        console.log(
          `Server responded with 429. Retrying after ${delay}ms delay...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        throw e;
      }
    }
  }
};
</script>

<style scoped>
.custom-textarea {
  position: relative;
  width: 100%;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 1.5em; /* 文字を大きくする */
  color: rgba(0, 0, 0, 0.6); /* 色を設定する */
  cursor: pointer; /* カーソルをポインターにする */
  transition: opacity 0.5s; /* アニメーションの追加 */
}

.arrow-down {
  font-size: 5em;
  margin-top: -60px;
}

.overlay v-icon {
  font-size: 2em; /* アイコンを大きくする */
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}

.custom-textarea textarea {
  text-align: center;
}
</style>
