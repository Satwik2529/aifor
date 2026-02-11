# 🎯 Quick Test Commands - BizNova Chatbot

## English Commands

### Basic Actions:
```
✅ "make bill" → Create a sale
✅ "bill 2 chocolates and 1 milk" → Create sale with items
✅ "add 100 chocolates, cost ₹20, selling ₹30" → Add inventory
✅ "add expense: Rent ₹5000, category Rent" → Add expense
```

### Advanced Features:
```
✅ "show upcoming festivals" → Festival forecasting
✅ "predict my sales" → Sales prediction
✅ "analyze my customers" → Customer behavior
✅ "show me alerts" → Business alerts
✅ "show business insights" → Complete overview
```

---

## Hindi Commands (हिंदी)

### Basic Actions:
```
✅ "बिल बनाओ" → Create a sale
✅ "2 चॉकलेट और 1 दूध का बिल बनाओ" → Create sale with items
✅ "100 चॉकलेट जोड़ें, लागत ₹20, बिक्री ₹30" → Add inventory
✅ "खर्च जोड़ें: किराया ₹5000" → Add expense
```

### Advanced Features:
```
✅ "आने वाले त्योहार दिखाओ" → Festival forecasting
✅ "बिक्री का अनुमान लगाओ" → Sales prediction
✅ "ग्राहकों का विश्लेषण करो" → Customer behavior
✅ "अलर्ट दिखाओ" → Business alerts
✅ "व्यावसायिक जानकारी दिखाओ" → Complete overview
```

---

## Telugu Commands (తెలుగు)

### Basic Actions:
```
✅ "బిల్లు చేయండి" → Create a sale
✅ "2 చాక్లెట్లు మరియు 1 పాలు బిల్లు చేయండి" → Create sale with items
✅ "100 చాక్లెట్లు జోడించండి, ఖర్చు ₹20, అమ్మకం ₹30" → Add inventory
✅ "ఖర్చు జోడించండి: అద్దె ₹5000" → Add expense
```

### Advanced Features:
```
✅ "రాబోయే పండుగలు చూపించు" → Festival forecasting
✅ "అమ్మకాల అంచనా చూపించు" → Sales prediction
✅ "కస్టమర్ల విశ్లేషణ చేయండి" → Customer behavior
✅ "హెచ్చరికలు చూపించు" → Business alerts
✅ "వ్యాపార అంతర్దృష్టులు చూపించు" → Complete overview
```

---

## 🎨 How to Change Language

1. Open chatbot (bottom right corner)
2. Look for language selector (usually top of chatbot)
3. Click and select:
   - **English** 🇬🇧
   - **हिंदी** (Hindi) 🇮🇳
   - **తెలుగు** (Telugu) 🇮🇳

---

## 📊 Expected Results

### "Make Bill" Command:
- **English:** "To create a bill, please specify items and quantities..."
- **Hindi:** "बिल बनाने के लिए, कृपया आइटम और मात्रा बताएं..."
- **Telugu:** "బిల్లు సృష్టించడానికి, దయచేసి వస్తువులు మరియు పరిమాణాలను..."

### "Show Festivals" Command:
- Shows list of upcoming festivals (Maha Shivratri, Holi, Ugadi, etc.)
- Includes dates, demand levels, and top selling items
- Response is in the selected language

### "Predict Sales" Command:
- Shows sales forecast for next 7 days
- Includes trend analysis and confidence level
- Response is in the selected language

---

## ⚡ Quick Tips

1. **Start simple:** Try "hi" or "hello" first
2. **Be specific:** "bill 2 chocolates" works better than just "bill"
3. **Use numbers:** "2 chocolates" is clearer than "two chocolates"
4. **Check language:** Make sure the correct language is selected
5. **Wait for response:** Some queries may take a few seconds

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Responds in English when Hindi/Telugu selected | Refresh page, check language selector |
| "Make bill" doesn't work | Try "bill 2 chocolates and 1 milk" with specific items |
| No festivals showing | Backend may not be running, check console |
| Rate limit error | Wait 20 seconds, or use pattern-matched queries |
| Slow responses | OpenAI API may be slow, pattern matching is faster |

---

## 🎯 Test Checklist

- [ ] Change language to Hindi → Test "बिल बनाओ"
- [ ] Change language to Telugu → Test "బిల్లు చేయండి"
- [ ] Test "show festivals" in all 3 languages
- [ ] Test "make bill" with specific items
- [ ] Test "predict sales" in all 3 languages
- [ ] Verify all responses are in selected language

---

**Backend Status:** ✅ Running on port 5000
**Festival Data:** ✅ 43 festivals loaded
**Languages:** ✅ English, Hindi, Telugu
**Pattern Matching:** ✅ Active (bypasses API)

**Ready to test! 🚀**
