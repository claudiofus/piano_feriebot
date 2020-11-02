const Telegraf = require('telegraf');
const Extra = require('telegraf/extra');
const Markup = require('telegraf/markup');
const Calendar = require('telegraf-calendar-telegram');
const bot = new Telegraf('TOKEN');
const admin = require('firebase-admin');

const serviceAccount = require("./turnocaffe-d0bb2b8963a1.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const ferieRef = db.collection('ferie');
let selectedDate;

bot.command('start', ({reply}) => {
    return reply('Benvenuto in questo bot, prima di iniziare, imposta il tuo nome e cognome nelle impostazioni di Telegram!', Markup
        .keyboard([
            ['📢 Piano Settimanale', '📢 Piano Mensile'],
            ['😎 Aggiungi ferie']
        ])
        .oneTime()
        .resize()
        .extra()
    )
});

bot.hears('😎 Aggiungi ferie', async ctx => {
    const today = new Date();
    const minDate = new Date();
    minDate.setMonth(today.getMonth() - 6);
    const maxDate = new Date();
    maxDate.setMonth(today.getMonth() + 6);
    maxDate.setDate(today.getDate());
    await ctx.reply("Scegli il tuo giorno di ferie", calendar.setMinDate(minDate).setMaxDate(maxDate).getCalendar());
});

bot.hears('📢 Piano Mensile', async ctx => {
    let response = '';
    const currentMonth = new Date().getMonth() + 1;

    const snapshot = await ferieRef.get();
    snapshot.forEach(doc => {
        let sorted = doc.data().date
            .filter(el => new Date(el).getMonth() + 1 === currentMonth)
            .map(el => new Date(el))
            .sort(compareDate);

        if (sorted.length > 0) {
            response += `<b>${doc.id}</b>\r\n`;
        }

        for (let elem of sorted) {
            response += `${toDate(elem)}\r\n`;
        }
    });
    response = response.length > 0 ? response : 'Non ho trovato i dati richiesti';
    return ctx.replyWithHTML(response);
});

bot.hears('📢 Piano Settimanale', async ctx => {
    let response = '';
    const snapshot = await ferieRef.get();
    snapshot.forEach(doc => {
        let sorted = doc.data().date
            .filter(el => new Date(el) >= getFirstDayWeek() && new Date(el) <= getLastDayWeek())
            .map(el => new Date(el))
            .sort(compareDate);

        if (sorted.length > 0) {
            response += `<b>${doc.id}</b>\r\n`;
        }

        for (let elem of sorted) {
            response += `${toDate(elem)}\r\n`;
        }
    });
    response = response.length > 0 ? response : 'Non ho trovato i dati richiesti';
    return ctx.replyWithHTML(response);
});

bot.catch((err) => {
    console.log("Error in bot:", err);
});

const calendar = new Calendar(bot, {
    startWeekDay: 1,
    weekDayNames: ["L", "M", "M", "G", "V", "S", "D"],
    monthNames: [
        "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
        "Lug", "Ago", "Set", "Ott", "Nov", "Dic"
    ]
});

calendar.setDateListener(async (ctx, date) => {
    selectedDate = date;
    await ctx.reply('Hai selezionato il ' + toITADate(date));
    return ctx.reply('Vuoi confermare le tue ferie?',
        Extra.HTML().markup((m) =>
            m.inlineKeyboard([
                m.callbackButton('Si', 'confirm-ferie'),
                m.callbackButton('No', 'cancel-ferie')
            ]))
    );
});

bot.action('cancel-ferie', ({deleteMessage}) => deleteMessage());
bot.action('confirm-ferie', async (ctx) => {
    let username = getUsername(ctx.update.callback_query.from);
    const userRef = ferieRef.doc(username);

    if (!selectedDate) {
        return ctx.reply('Scegli la data delle tue ferie');
    }

    const doc = await userRef.get();
    if (!doc.exists) {
        await userRef.set({date: [selectedDate]});
    } else {
        console.log('Document data:', doc.data());
        await userRef.update({
            date: admin.firestore.FieldValue.arrayUnion(selectedDate)
        });
    }
    return ctx.reply('👍 Ferie inserite');
});

const getUsername = (credentialObj) => {
    let firstName = credentialObj.first_name;
    let lastName = credentialObj.last_name;
    return lastName ? `${firstName} ${lastName}` : firstName;
}

const toITADate = (dateStr) => {
    let [year, month, day] = dateStr.split('-');
    if (day && day.length < 2) {
        day = '0' + day;
    }
    if (month && month.length < 2) {
        month = '0' + month;
    }
    return `${day}/${month}/${year}`;
}

const toDate = (dateStr) => {
    const date = dateStr.toJSON().split('T')[0];
    return toITADate(date);
}

const getFirstDayWeek = () => {
    const today = new Date();
    const firstDay = today.getDate() - today.getDay();
    return new Date(today.setDate(firstDay));
}

const getLastDayWeek = () => {
    const today = new Date();
    const firstDay = today.getDate() - today.getDay();
    const lastDay = firstDay + 6;
    return new Date(today.setDate(lastDay));
}

const compareDate = (a, b) => {
    if (a > b) return -1;
    if (a < b) return 1;
    return 0;
}

bot.startPolling();