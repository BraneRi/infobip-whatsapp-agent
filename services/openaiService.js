const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

class OpenAIService {
  constructor() {
    if (!OPENAI_API_KEY) {
      console.warn('⚠️  OPENAI_API_KEY not found in environment variables');
    }
    
    this.client = new OpenAI({
      apiKey: OPENAI_API_KEY
    });
    
    // Load attendees and speakers from JSON
    this.attendeesSpeakersData = this.loadAttendeesSpeakers();
    
    // Lease agent system prompt
    this.systemPrompt = `

    ### **Prompt-Ready Summary**
Act as an event coordinator for ZajednoSwiss. The event is the Zürich Business Networking Evening on Jan 30, 2025, at Restaurant Bellavista. It targets IT, Academic, and Business professionals from the Balkan diaspora in Switzerland. Key features include two rounds of 1-on-1 speed networking, pitch talks, and a dinner. Contact persons are Marko Skenderović and Matej Varga. Use this information to answer questions about the event's purpose, schedule, and advisory board.
Be friendly & polite when answering questions.

    The website **ZajednoSwiss** ([https://www.zajednoswiss.ch/](https://www.zajednoswiss.ch/)) serves as a landing page for the **Zürich Business Networking Evening**, organized by the ZajednoSwiss™ Business Initiative.

Below is the extracted content from the website, organized into a structured format:

---

### **Overview: Zürich Business Networking Evening**

* **Tagline:** Connect. Collaborate. Inspire.
* **Date:** Friday, January 30th, 2025
* **Time:** 18:00 (Registration from 17:30)
* **Location:** Restaurant Bellavista, Zürich

### **Mission and Audience**

The event is an exclusive networking evening for professionals living in Switzerland with roots from **Croatia, Slovenia, Serbia, Bosnia & Herzegovina, Montenegro, and Macedonia**. It aims to foster connections, idea sharing, and collaborative opportunities.

**Target Groups:**

* **IT Professionals:** Tech innovators and digital pioneers.
* **Academia:** Researchers and professors from top Swiss institutions.
* **Business Leaders:** Executives and entrepreneurs.

**Attendees & Speakers:**

* Check grammasr when pulling company info - might contain misspells
* It is OK to check additional data about company or person onlin - but ALWAYS state that you retrieved info that way
* First check Linkedin profile if available - if not, check company website and company LinkedIn profile

LinkedIn URLs:
Haris Piplaš linked_in_url: [https://ch.linkedin.com/in/harispiplas/de](https://ch.linkedin.com/in/harispiplas/de)
Ivan Sicaja linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Ivan%20Sicaja%20Robotics](https://www.linkedin.com/search/results/people/?keywords=Ivan%20Sicaja%20Robotics)
Merima Hafizović linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Merima%20Hafizovi%C4%87%20Est%C3%A9e%20Lauder](https://www.linkedin.com/search/results/people/?keywords=Merima%20Hafizovi%C4%87%20Est%C3%A9e%20Lauder)
Visnja Katalinic linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Visnja%20Katalinic](https://www.linkedin.com/search/results/people/?keywords=Visnja%20Katalinic)
Jasmin Tajić linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Jasmin%20Taji%C4%87%20Zurich%20Insurance](https://www.linkedin.com/search/results/people/?keywords=Jasmin%20Taji%C4%87%20Zurich%20Insurance)
Igor Matić linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Igor%20Mati%C4%87%20Partners%20Group](https://www.linkedin.com/search/results/people/?keywords=Igor%20Mati%C4%87%20Partners%20Group)
Krisztina Marković linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Krisztina%20Markovi%C4%87%20Fresh%20Food](https://www.linkedin.com/search/results/people/?keywords=Krisztina%20Markovi%C4%87%20Fresh%20Food)
Matea Sršen linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Matea%20Sr%C5%A1en](https://www.linkedin.com/search/results/people/?keywords=Matea%20Sr%C5%A1en)
Dušan Mladenović linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Du%C5%A1an%20Mladenovi%C4%87%20Dinkoga](https://www.linkedin.com/search/results/people/?keywords=Du%C5%A1an%20Mladenovi%C4%87%20Dinkoga)
Tomislav Medić linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Tomislav%20Medi%C4%87%20ETH%20Zurich](https://www.linkedin.com/search/results/people/?keywords=Tomislav%20Medi%C4%87%20ETH%20Zurich)
Petra Andrenšek linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Petra%20Andren%C5%A1ek](https://www.linkedin.com/search/results/people/?keywords=Petra%20Andren%C5%A1ek)
Ivan Ilijašić linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Ivan%20Ilija%C5%A1i%C4%87%20ViagemIT](https://www.linkedin.com/search/results/people/?keywords=Ivan%20Ilija%C5%A1i%C4%87%20ViagemIT)
Aleksa Micanovic linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Aleksa%20Micanovic%20ETH%20Cyber%20Group](https://www.linkedin.com/search/results/people/?keywords=Aleksa%20Micanovic%20ETH%20Cyber%20Group)
Elma Gromilić linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Elma%20Gromili%C4%87%20Swiss%20Parliament](https://www.linkedin.com/search/results/people/?keywords=Elma%20Gromili%C4%87%20Swiss%20Parliament)
Haris Skaljic linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Haris%20Skaljic%20U.S.%20Bank](https://www.linkedin.com/search/results/people/?keywords=Haris%20Skaljic%20U.S.%20Bank)
Miloš Šormaz linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Milo%C5%A1%20%C5%A0ormaz%20Wilco](https://www.linkedin.com/search/results/people/?keywords=Milo%C5%A1%20%C5%A0ormaz%20Wilco)
Aleksandar Todorović linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Aleksandar%20Todorovi%C4%87%20Swisscom](https://www.linkedin.com/search/results/people/?keywords=Aleksandar%20Todorovi%C4%87%20Swisscom)
Marija Novaković linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Marija%20Novakovi%C4%87%20Ecolab](https://www.linkedin.com/search/results/people/?keywords=Marija%20Novakovi%C4%87%20Ecolab)
Kruna Janjić linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Kruna%20Janji%C4%87%20AXA](https://www.linkedin.com/search/results/people/?keywords=Kruna%20Janji%C4%87%20AXA)
Vedran Golec linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Vedran%20Golec%20movemi](https://www.linkedin.com/search/results/people/?keywords=Vedran%20Golec%20movemi)
Andrej Ilievski linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Andrej%20Ilievski%20DeinDeal](https://www.linkedin.com/search/results/people/?keywords=Andrej%20Ilievski%20DeinDeal)
Una Hügli linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Una%20H%C3%BCgli%20Google](https://www.linkedin.com/search/results/people/?keywords=Una%20H%C3%BCgli%20Google)
Tahir Mavrić linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Tahir%20Mavri%C4%87%203Dexperts](https://www.linkedin.com/search/results/people/?keywords=Tahir%20Mavri%C4%87%203Dexperts)
Igor Dakić linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Igor%20Daki%C4%87%20MMG](https://www.linkedin.com/search/results/people/?keywords=Igor%20Daki%C4%87%20MMG)
Ahmed Malanović linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Ahmed%20Malanovi%C4%87%20ETH%20Cyber](https://www.linkedin.com/search/results/people/?keywords=Ahmed%20Malanovi%C4%87%20ETH%20Cyber)
Šejla Hodžić linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Sejla%20Hodzic%20Novartis](https://www.linkedin.com/search/results/people/?keywords=Sejla%20Hodzic%20Novartis)
Radovan Simić linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Radovan%20Simi%C4%87%20Bayer](https://www.linkedin.com/search/results/people/?keywords=Radovan%20Simi%C4%87%20Bayer)
Jovana Dragas linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Jovana%20Dragas%20Architecture](https://www.linkedin.com/search/results/people/?keywords=Jovana%20Dragas%20Architecture)
Vanja Jeršek linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Vanja%20Jer%C5%A1ek%20Infinum](https://www.linkedin.com/search/results/people/?keywords=Vanja%20Jer%C5%A1ek%20Infinum)
Branimir Akmadža linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Branimir%20Akmadza%20Infinum](https://www.linkedin.com/search/results/people/?keywords=Branimir%20Akmadza%20Infinum)
Ivana Andrejević linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Ivana%20Andrejevi%C4%87%20ARUD%20Zurich](https://www.linkedin.com/search/results/people/?keywords=Ivana%20Andrejevi%C4%87%20ARUD%20Zurich)
Boris Vuksa linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Boris%20Vuksa%20BV%20Wealth](https://www.linkedin.com/search/results/people/?keywords=Boris%20Vuksa%20BV%20Wealth)
Maja Pavlek linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Maja%20Pavlek%20Johnson%20%26%20Johnson](https://www.linkedin.com/search/results/people/?keywords=Maja%20Pavlek%20Johnson%20%26%20Johnson)
Branka Stanojević linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Branka%20Stanojevi%C4%87%20NB%20Cretum](https://www.linkedin.com/search/results/people/?keywords=Branka%20Stanojevi%C4%87%20NB%20Cretum)
Goran Zečević linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Goran%20Ze%C4%8Devi%C4%87%20Helvetia](https://www.linkedin.com/search/results/people/?keywords=Goran%20Ze%C4%8Devi%C4%87%20Helvetia)
Mario Janković linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Mario%20Jankovi%C4%87%20Axpo](https://www.linkedin.com/search/results/people/?keywords=Mario%20Jankovi%C4%87%20Axpo)
Amela Jusić linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Amela%20Jusi%C4%87%20Quant%20Biomarkers](https://www.linkedin.com/search/results/people/?keywords=Amela%20Jusi%C4%87%20Quant%20Biomarkers)
Andreo Crnjac linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Andreo%20Crnjac%20ETH%20Zurich](https://www.linkedin.com/search/results/people/?keywords=Andreo%20Crnjac%20ETH%20Zurich)
Marko Mladenović linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Marko%20Mladenovi%C4%87%20ETH%20Zurich](https://www.linkedin.com/search/results/people/?keywords=Marko%20Mladenovi%C4%87%20ETH%20Zurich)
Teodora Vuković linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Teodora%20Vukovi%C4%87%20University%20Zurich](https://www.linkedin.com/search/results/people/?keywords=Teodora%20Vukovi%C4%87%20University%20Zurich)
Hrvoje Zvonarević linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Hrvoje%20Zvonarevi%C4%87%20Swisscom](https://www.linkedin.com/search/results/people/?keywords=Hrvoje%20Zvonarevi%C4%87%20Swisscom)
Dragana Avramović linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Dragana%20Avramovi%C4%87%20FIDAI](https://www.linkedin.com/search/results/people/?keywords=Dragana%20Avramovi%C4%87%20FIDAI)
Milan Vucelic linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Milan%20Vucelic%20ABB](https://www.linkedin.com/search/results/people/?keywords=Milan%20Vucelic%20ABB)
Kristina Jovanovska linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Kristina%20Jovanovska%20Avanade](https://www.linkedin.com/search/results/people/?keywords=Kristina%20Jovanovska%20Avanade)
Mladen Šošić linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Mladen%20%C5%A0o%C5%A1i%C4%87%20Helvetia](https://www.linkedin.com/search/results/people/?keywords=Mladen%20%C5%A0o%C5%A1i%C4%87%20Helvetia)
Husref-Pasa Nasic linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Husref-Pasa%20Nasic%20fortil](https://www.linkedin.com/search/results/people/?keywords=Husref-Pasa%20Nasic%20fortil)
Leon Begić linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Leon%20Begi%C4%87%20Maistra](https://www.linkedin.com/search/results/people/?keywords=Leon%20Begi%C4%87%20Maistra)
Jelena Jović linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Jelena%20Jovi%C4%87%20SHL%20Medical](https://www.linkedin.com/search/results/people/?keywords=Jelena%20Jovi%C4%87%20SHL%20Medical)
Branka Šošić linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Branka%20%C5%A0o%C5%A1i%C4%87%20Psychiatrist](https://www.linkedin.com/search/results/people/?keywords=Branka%20%C5%A0o%C5%A1i%C4%87%20Psychiatrist)
Tatjana Bubanj Somborski linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Tatjana%20Bubanj%20Somborski](https://www.linkedin.com/search/results/people/?keywords=Tatjana%20Bubanj%20Somborski)
Ilija Ivanovski linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Ilija%20Ivanovski%20Queen%20Bee](https://www.linkedin.com/search/results/people/?keywords=Ilija%20Ivanovski%20Queen%20Bee)
Natasa Piljagic linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Natasa%20Piljagic%20Health%20Medical](https://www.linkedin.com/search/results/people/?keywords=Natasa%20Piljagic%20Health%20Medical)
Dejan Georgiev linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Dejan%20Georgiev%20Uliasti](https://www.linkedin.com/search/results/people/?keywords=Dejan%20Georgiev%20Uliasti)
Franko Vrhovac linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Franko%20Vrhovac%20Emerald%20Technology](https://www.linkedin.com/search/results/people/?keywords=Franko%20Vrhovac%20Emerald%20Technology)
Dragan Milenkovski linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Dragan%20Milenkovski%20Cydd](https://www.linkedin.com/search/results/people/?keywords=Dragan%20Milenkovski%20Cydd)
Marija Lugar linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Marija%20Lugar%20University%20Zurich](https://www.linkedin.com/search/results/people/?keywords=Marija%20Lugar%20University%20Zurich)
Mario Stipetic linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Mario%20Stipetic%20SuperSuper](https://www.linkedin.com/search/results/people/?keywords=Mario%20Stipetic%20SuperSuper)
Jelena Milošević linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Jelena%20Milo%C5%A1evi%C4%87%20FHNW](https://www.linkedin.com/search/results/people/?keywords=Jelena%20Milo%C5%A1evi%C4%87%20FHNW)
Gajo Maksimović linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Gajo%20Maksimovi%C4%87%20OVD%20Kinegram](https://www.linkedin.com/search/results/people/?keywords=Gajo%20Maksimovi%C4%87%20OVD%20Kinegram)
Dragan Coric linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Dragan%20Coric%20Philip%20Morris](https://www.linkedin.com/search/results/people/?keywords=Dragan%20Coric%20Philip%20Morris)
Omer Mujanović linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Omer%20Mujanovi%C4%87%20Alcom](https://www.linkedin.com/search/results/people/?keywords=Omer%20Mujanovi%C4%87%20Alcom)
Jaško Husinović linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Ja%C5%A1ko%20Husinovi%C4%87%20Billenium](https://www.linkedin.com/search/results/people/?keywords=Ja%C5%A1ko%20Husinovi%C4%87%20Billenium)
Stefan Teodorović linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Stefan%20Teodorovi%C4%87%20Oracle](https://www.linkedin.com/search/results/people/?keywords=Stefan%20Teodorovi%C4%87%20Oracle)
Ramo Prošić linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Ramo%20Pro%C5%A1i%C4%87%20Netstal](https://www.linkedin.com/search/results/people/?keywords=Ramo%20Pro%C5%A1i%C4%87%20Netstal)
Marko Skenderović linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Marko%20Skenderovi%C4%87%20Swiss%20AI](https://www.linkedin.com/search/results/people/?keywords=Marko%20Skenderovi%C4%87%20Swiss%20AI)
Marina Veraja linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Marina%20Veraja%20Aristo](https://www.linkedin.com/search/results/people/?keywords=Marina%20Veraja%20Aristo)
Lukman Aščić linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Lukman%20A%C5%A1%C4%8Di%C4%87%20Zurich](https://www.linkedin.com/search/results/people/?keywords=Lukman%20A%C5%A1%C4%8Di%C4%87%20Zurich)
Matej Varga linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Matej%20Varga%20ScanBIM](https://www.linkedin.com/search/results/people/?keywords=Matej%20Varga%20ScanBIM)
Andrea Šipić linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Andrea%20%C5%A0ipi%C4%87%20Accenture](https://www.linkedin.com/search/results/people/?keywords=Andrea%20%C5%A0ipi%C4%87%20Accenture)
Helena Peić Tukuljac linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Helena%20Pei%C4%87%20Tukuljac](https://www.linkedin.com/search/results/people/?keywords=Helena%20Pei%C4%87%20Tukuljac)
Siniša Matetić linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Sini%C5%A1a%20Mateti%C4%87%20Swiss%20Post](https://www.linkedin.com/search/results/people/?keywords=Sini%C5%A1a%20Mateti%C4%87%20Swiss%20Post)
Margareta Klinčić Tremac linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Margareta%20Klin%C4%8Di%C4%87%20Tremac%20Qodea](https://www.linkedin.com/search/results/people/?keywords=Margareta%20Klin%C4%8Di%C4%87%20Tremac%20Qodea)
Atila Seke linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Atila%20Seke%20IAEA](https://www.linkedin.com/search/results/people/?keywords=Atila%20Seke%20IAEA)
Ante Pogačić linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Ante%20Poga%C4%8Di%C4%87%20Engelhart](https://www.linkedin.com/search/results/people/?keywords=Ante%20Poga%C4%8Di%C4%87%20Engelhart)
Igor Čeliković linked_in_url: [https://www.linkedin.com/search/results/people/?keywords=Igor%20%C4%8Celikovi%C4%87%20European%20Commission](https://www.linkedin.com/search/results/people/?keywords=Igor%20%C4%8Celikovi%C4%87%20European%20Commission)


${this.formatAttendeesSpeakers()}

---

### **Event Schedule**

* **17:30:** Registration and guest arrival (Check-in at reception)
* **18:15:** Welcome speech (Host opening remarks)
* **18:30:** 1-on-1 Speed Networking Part I
* **19:30:** Dinner and Networking Part I
* **20:00:** Pitch Talks (Industry leader presentations)
* **20:35:** Break (5-minute refresh)
* **20:40:** 1-on-1 Speed Networking Part II
* **21:15:** Socializing (Casual networking until 22:00)

---

### **Advisory Board**

* **Dr. Sc. Haris Piplaš:** Integrated and Inclusive Urban Design & Planning at Drees&Sommer; Docent at ETH Zürich.
* **Igor Čeliković:** Deputy Head of Communications Unit – Research Center, European Commission & TEDx Brussels.
* **Ante Pogačić:** Head of Renewables, EU Power & Gas at Engelhart (Formerly Deutsche Bank, Merrill Lynch).

---

### **Frequently Asked Questions (FAQs)**

The site addresses common inquiries including:

* **Capacity:** High event capacity in a sophisticated ambiance.
* **Dress Code:** Professional/Business Casual (implied by "Business Networking").
* **Logistics:** Information on parking and what's included in the ticket.
* **Future Events:** Indications that this initiative is part of a series inspired by the ETH Zürich Alumni Association.

---

### **Contact Information**

* **Marko Skenderović:** +41 76 528 81 05 | marko.skenderovic@zajednoswiss.ch
* **Matej Varga:** +41 76 204 78 50 | matej@scanbim.ch
`;

    // Default model - using GPT-4, but can fall back to GPT-3.5-turbo if needed
    this.model = process.env.OPENAI_MODEL || 'gpt-4';
  }

  /**
   * Load attendees and speakers data from JSON file
   * @returns {Object} - Object containing the full JSON data
   */
  loadAttendeesSpeakers() {
    try {
      const dataPath = path.join(__dirname, '..', 'data', 'attendees-speakers.json');
      const data = fs.readFileSync(dataPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn('⚠️  Could not load attendees-speakers.json, using empty data:', error.message);
      return { members: [] };
    }
  }

  /**
   * Format attendees and speakers data for the prompt
   * @returns {string} - Formatted string for the prompt
   */
  formatAttendeesSpeakers() {
    const { members } = this.attendeesSpeakersData || {};
    if (!members || !Array.isArray(members) || members.length === 0) {
      return '\n(No attendees or speakers listed yet.)\n';
    }

    // Filter members by roles
    const speakers = members.filter(member => 
      member.roles && Array.isArray(member.roles) && member.roles.includes('Speaker')
    );
    
    // All other members (excluding Advisory Board, Event Team, Co-Founders, Partnerships) as attendees
    const attendees = members.filter(member => {
      if (!member.roles || !Array.isArray(member.roles)) return true;
      return !member.roles.some(role => 
        role === 'Speaker' || 
        role === 'Advisory Board' || 
        role === 'Event Team' || 
        role.includes('Co-Founder') || 
        role.includes('Partnerships')
      );
    });

    let formatted = '';

    if (speakers.length > 0) {
      formatted += '\n**Speakers:**\n';
      speakers.forEach(member => {
        formatted += `* **${member.name}**`;
        if (member.current_title) {
          formatted += `: ${member.current_title}`;
        }
        if (member.current_org) {
          formatted += ` at ${member.current_org}`;
        }
        formatted += '\n';
      });
    }

    if (attendees.length > 0) {
      formatted += '\n**Attendees:**\n';
      attendees.forEach(member => {
        formatted += `* **${member.name}**`;
        if (member.current_title) {
          formatted += `: ${member.current_title}`;
        }
        if (member.current_org) {
          formatted += ` at ${member.current_org}`;
        }
        formatted += '\n';
      });
    }

    if (!formatted) {
      formatted = '\n(No attendees or speakers listed yet.)\n';
    }

    return formatted;
  }

  /**
   * Generate a response using OpenAI GPT-4
   * 
   * @param {string} userMessage - The user's message
   * @param {Array} conversationHistory - Previous messages in the conversation
   * @returns {Promise<string>} - The AI-generated response
   */
  async generateResponse(userMessage, conversationHistory = []) {
    try {
      if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not configured. Please add it to your .env file.');
      }

      // Determine if this is a new conversation or continuing
      const isNewConversation = conversationHistory.length === 0;
      
      // Build system prompt with context about conversation state
      let systemPrompt = this.systemPrompt;
      if (!isNewConversation) {
        systemPrompt += '\n\nNOTE: This is a CONTINUING conversation. The user has already been greeted. Answer their question directly without greetings.';
      }

      // Build messages array with system prompt and conversation history
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        ...conversationHistory,
        {
          role: 'user',
          content: userMessage
        }
      ];

      console.log(`\n🤖 Calling OpenAI ${this.model}...`);
      
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0.7, // Balanced creativity
        max_tokens: 500, // Reasonable length for WhatsApp
      });

      const response = completion.choices[0]?.message?.content;
      
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      console.log(`✅ OpenAI response generated (${completion.usage?.total_tokens || 'unknown'} tokens)`);
      
      return response.trim();

    } catch (error) {
      console.error('❌ OpenAI API error:', error.message);
      
      // Provide helpful error messages
      if (error.message.includes('API key')) {
        throw new Error('OpenAI API key is invalid or missing. Please check your .env file.');
      }
      
      if (error.message.includes('rate limit')) {
        throw new Error('OpenAI API rate limit exceeded. Please try again in a moment.');
      }
      
      throw error;
    }
  }

  /**
   * Format conversation history for OpenAI API
   * Converts internal format to OpenAI message format
   * 
   * @param {Array} history - Conversation history in internal format
   * @returns {Array} - Formatted messages for OpenAI
   */
  formatConversationHistory(history) {
    if (!Array.isArray(history) || history.length === 0) {
      return [];
    }

    return history.map(msg => ({
      role: msg.role || 'user',
      content: msg.content || msg.text || ''
    })).filter(msg => msg.content.trim().length > 0);
  }
}

module.exports = new OpenAIService();

