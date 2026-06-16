# LawyGo TWA 서명 정보

| 항목 | 값 |
|------|-----|
| 패키지 ID | `app.lawygo.twa` |
| Keystore | `android.p12` (로컬·CI 전용, git 제외) |
| Alias | `lawygo` |
| 기본 비밀번호 | `lawygo-twa-ci-2026` (운영 시 변경 권장) |

## SHA-256 (Digital Asset Links)

```
E5:21:0C:1F:5A:71:22:7D:88:79:F7:4D:5A:DC:69:EA:15:7C:E2:4A:31:D4:B3:05:BF:63:BA:10:E8:BA:1E:A0
```

Vercel `TWA_ANDROID_SHA256` / `TWA_PACKAGE_ID` 에 등록됨.

재생성: `npm run setup:twa-signing`
