//Fraktalpunkte rein mathematisch berechnen (2D) -> lok. Koord.sys. der Wand (Child anhängen) -> autom. Weltransf.

export default class DragonFractal {

    //Erzeugt Fraktal und sorgt für Startzustand = Ordnung 0
    constructor() {
        this.reset();
    }

    //Fraktal zurücksetzen -> Startlinie (Ordnung 0)
    reset() {
        this.points = [
            {x: -0.5, y:0},
            {x: 0.5, y:0}
        ];
        
        this.order = 0; //Iteration auf 0 setzen
    }

    //Erhöt die Fraktalordnung um genau 1
    iterate() {
        this.points = this.#dragonStep(this.points);    //aus aktuellen Punkte Array -> überschreibt Array mit Punkte aus Knickberechnung
        this.order++;
    }

    //Punkte für Kopie abrufen -> interner Zustand bleibt sicher
    getPoints() {
        return this.points.map(p => ({ x: p.x, y: p.y}));
    }

    //aktuelle Ordnung abfragen
    getOrder() {
        return this.order;
    }

    //private -> sichert Eingriff in den Algorithmus
    #dragonStep(oldPoints) {
        const newPoints = [];
        newPoints.push(oldPoints[0]);   //Übernahme erster Punkt

        //Fraktalberechnung
        for (let i=0; i<oldPoints.length -1; i++) {
            const a = oldPoints[i];
            const b = oldPoints[i+1];

            //Richtungsvektor
            const dx = b.x - a.x;
            const dy = b.y - a.y;

            //Mittelpunkt
            const mx = a.x + dx * 0.5;
            const my = a.y + dy * 0.5;

            //Linienlänge
            const length = Math.sqrt(dx * dx + dy * dy);

            //Normalenvektor, aber um 90° gedreht
            let nx = -dy;
            let ny = dx;

            //Normieren
            const nLen = Math.sqrt(nx * nx + ny * ny);
            nx /= nLen;
            ny /= nLen;

            //Jede zweite Linie kippen
            if(i % 2 == 1) {
                nx = -nx;
                ny = -ny;
            }

            //Neuer Knickpunkt
            const px = mx + nx * (length * 0.5);
            const py = my + ny * (length * 0.5);

            newPoints.push({x: px, y: py});
            newPoints.push(b);
        }

        return newPoints;
    }
}