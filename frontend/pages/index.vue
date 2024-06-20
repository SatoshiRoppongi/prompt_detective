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
                        :disabled="!walletAddress"
                      >
                        <template v-slot:append>
                          <transition name="fade">
                            <div
                              v-if="!focused && !promptString"
                              class="overlay"
                              @click="focusTextarea"
                            >
                              <v-icon large>{{ mdiHelp }}</v-icon>
                              <div v-if="walletAddress">ここをクリックしてください</div>
                              <div v-else="walletAddress">予想するにはウォレットに接続してください</div>
                            </div>
                          </transition>
                        </template>
                      </v-textarea>
                      <div class="d-flex justify-end">
                        <v-btn v-if="walletAddress" type="submit" :disabled="!promptString"
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
              <v-card-title>クイズサマリー</v-card-title>
              <v-divider></v-divider>
              <v-card-text>
                <v-row class="mb-3">
                  <v-col cols="6" class="d-flex align-center">
                    <v-icon class="mr-2"> {{ mdiAccountMultiple }}</v-icon>
                    参加者数
                  </v-col>
                  <v-col cols="6" class="text-right">
                    <div class="headline"> {{ summaryInfo.totalParticipants }} アドレス</div>
                  </v-col>
                </v-row>
                <v-row class="mb-3">
                  <v-col cols="6" class="d-flex align-center">
                    <v-icon class="mr-2"> {{ mdiCurrencyUsd }}</v-icon>
                    ポット
                  </v-col>
                  <v-col cols="6" class="text-right">
                    <div class="headline"> {{ summaryInfo.pot }} sol </div>
                  </v-col>
                </v-row>
              </v-card-text>
              <v-card-title>bet金額</v-card-title>
              <v-divider></v-divider>
              <v-card-text>
                <v-row v-for="(participant, index) in summaryInfo.participants" v-bind:key="participant.walletAddress" class="mb-2">
                  address: {{ truncateAddress(participant.walletAddress) }} bet: {{ participant.bet }}sol
                  <!--
                  TODO: 上記見やすいようにする。
                  vuetifyにゲージを表示するコンポーネントある？
                  ・potから掛金を割って%を出す
                  ・折りたためるようにする
                  ・上位数名のみ表示する？
                  ・ユーザの居場所を表示する
                  -->

                </v-row>
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
              v-model.number="bet"
              suffix="SOL"
            ></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="green darken-1" @click="submitInfo"
            >確定</v-btn
          >
          <v-btn color="green darken-1" @click="closeModal"
            >キャンセル</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, toRefs} from "vue";
import { useRuntimeConfig } from "#app";
import { mdiHelp, mdiArrowDownThick, mdiAccountMultiple, mdiCurrencyUsd} from "@mdi/js";

import { useWallet } from "~/composables/useWallets";

const { walletAddress } = useWallet();
console.log('walletAddress:', walletAddress.value)

const input = ref("");
const promptString = ref("");
const focused = ref(false);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const showDialog = ref(false);
const bet = ref(0);
const quizId = ref("");
const imageUrl = ref("");  // 画像URLを保持するref
const isLoading = ref(true); // ローディング状態を保持するref
const errorMessage = ref(""); // エラーメッセージを保持するref

interface Participant {
  bet: number;
  walletAddress: string;
}

interface SummaryInfo {
  totalParticipants: number; // 参加者数
  pot: number; // 参加者掛金合計
  participants: Array<Participant>
}

const summaryInfo = reactive<SummaryInfo>({
  totalParticipants: 0,
  pot:0,
  participants: [],
})

const truncateAddress = (fullAddress:string): string => {
  return fullAddress.substring(0, 7) + '...' + fullAddress.substring(fullAddress.length - 2);
}

const handleFocus = () => {
  focused.value = true;
};

const handleBlur = () => {
  focused.value = false;
};

const focusTextarea = () => {
  focused.value = true;
  nextTick(() => {
      textareaRef.value!.focus();
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
const apiUrl = `${apiBaseUrl}/prompt-detective-backend/us-central1/api`;

const fetchData = async () => {
  try {
    // quizの情報を取得する
    const quizInfoPromise = await fetch(`${apiUrl}/latestQuiz`);
    if (!quizInfoPromise) {
      throw new Error("問題情報が取得できませんでした");
    }

    const quizInfo = await quizInfoPromise.json()
    console.log('quizInfo:', quizInfo)

    summaryInfo.totalParticipants = quizInfo.totalParticipants
    summaryInfo.pot = quizInfo.pot
    summaryInfo.participants = quizInfo.participants.sort((accountA: Participant, accountB: Participant) => accountB.bet - accountA.bet);

    const imageName= quizInfo.id
    quizId.value = quizInfo.id
    const imageInfoPromise = await fetch(`${apiUrl}/image?name=${imageName}`);
    const imageData = await imageInfoPromise.json();
    if (imageData && imageData.url) {
      imageUrl.value = imageData.url; // 取得した画像URLをセット
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
onMounted(fetchData);

const submitInfo = async () => {
  console.log("Form submitted with input:", input.value);
  console.log("Betting:", bet.value);

  try {
    const info = {
      quizId: quizId.value,
      walletAddress: walletAddress.value,
      guessPrompt: promptString.value,
      bet: Number(bet.value),
    };
    const response = await fetch(`${apiUrl}/participation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(info),
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    closeModal();
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
</style>: { bet: number; }: { bet: number; }
