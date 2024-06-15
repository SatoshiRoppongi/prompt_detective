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
                    <v-form @submit.prevent="submitForm">
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
                        <v-btn type="submit">確定・送信</v-btn>
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
                <v-img
                  lazy-src="https://picsum.photos/900/300/?random"
                  src="https://picsum.photos/900/300/?random"
                  width="100%"
                >
                </v-img>
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
  </v-app>
</template>

<script setup lang="ts">
import { ref, nextTick } from "vue";
import { mdiHelp, mdiArrowDownThick } from "@mdi/js";

import connectWalletButton from "~/components/ConnectWalletButton";

const input = ref("");
const promptString = ref("");
const focused = ref(false);
const textareaRef = ref(null);

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

const submitForm = async () => {
  console.log("Form submitted with input:", input.value);
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
