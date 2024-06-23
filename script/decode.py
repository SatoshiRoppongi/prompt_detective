from borsh_construct import U64, CStruct
import binascii

# シリアライズされたデータのデコードクラス
JoinQuiz = CStruct(
    "bet" / U64,
    "fee" / U64
)

# シリアライズされたデータ (例: "00e1f505000000001027000000000000")
data = binascii.unhexlify("00e1f505000000001027000000000000")

# デコード
decoded = JoinQuiz.parse(data)
print("Decoded data:", decoded)
