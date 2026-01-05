import * as THREE from 'three';

/**
 * Personen-Erstellung und -Verwaltung
 */
export class PersonManager {
    constructor(scene) {
        this.scene = scene;
        this.persons = {};
    }

    /**
     * Humanoides Spielermodell mit realistischen Proportionen erstellen
     */
    createPerson(position = new THREE.Vector3(0, 0, 0), options = {}) {
        const config = {
            skinColor: options.skinColor || 0xfdbcb4,
            clothingColor: options.clothingColor || 0x4169e1,
            pantsColor: options.pantsColor || 0x2f4f4f,
            shoeColor: options.shoeColor || 0x000000,
            hairColor: options.hairColor || 0x8b4513,
            scale: options.scale || 1,
            name: options.name || 'person_' + Date.now()
        };

        const personGroup = new THREE.Group();
        personGroup.name = config.name;

        const skinMaterial = new THREE.MeshLambertMaterial({ color: config.skinColor });
        const clothingMaterial = new THREE.MeshLambertMaterial({ color: config.clothingColor });
        const pantsMaterial = new THREE.MeshLambertMaterial({ color: config.pantsColor });
        const shoeMaterial = new THREE.MeshLambertMaterial({ color: config.shoeColor });
        const hairMaterial = new THREE.MeshLambertMaterial({ color: config.hairColor });

        personGroup.bodyParts = {};
        personGroup.bodyParts.head = this.createHead(personGroup, skinMaterial, config.scale);
        personGroup.bodyParts.hair = this.createHair(personGroup, hairMaterial, config.scale);
        personGroup.bodyParts.eyes = this.createEyes(personGroup, config.scale);
        personGroup.bodyParts.torso = this.createTorso(personGroup, clothingMaterial, config.scale);
        personGroup.bodyParts.arms = this.createArms(personGroup, clothingMaterial, skinMaterial, config.scale);
        personGroup.bodyParts.legs = this.createLegs(personGroup, pantsMaterial, config.scale);
        personGroup.bodyParts.feet = this.createFeet(personGroup.bodyParts.legs, shoeMaterial, config.scale);

        // Animationszustand
        personGroup.animationState = {
            isWalking: false,
            isJumping: false,
            walkCycle: 0,
            jumpProgress: 0,
            lastPosition: personGroup.position.clone(),
            velocity: new THREE.Vector3()
        };

        personGroup.position.copy(position);
        personGroup.BBox = new THREE.Box3().setFromObject(personGroup);

        this.persons[config.name] = personGroup;
        this.scene.add(personGroup);

        console.log(`Person created: ${config.name}, children count: ${personGroup.children.length}`);

        return personGroup;
    }

    createHead(personGroup, skinMaterial, scale) {
        const headGeometry = new THREE.SphereGeometry(0.15 * scale, 16, 16);
        const head = new THREE.Mesh(headGeometry, skinMaterial);
        head.position.set(0, 1.65 * scale, 0);
        head.castShadow = true;
        head.receiveShadow = true;
        personGroup.add(head);
        return head;
    }

    createEyes(personGroup, scale) {
        const eyeWhiteMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const pupilMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });

        const eyeGeometry = new THREE.SphereGeometry(0.03 * scale, 8, 8);
        const pupilGeometry = new THREE.SphereGeometry(0.015 * scale, 6, 6);

        const leftEye = new THREE.Mesh(eyeGeometry, eyeWhiteMaterial);
        leftEye.position.set(-0.04 * scale, 1.62 * scale, 0.13 * scale);
        leftEye.castShadow = true;
        leftEye.receiveShadow = true;
        personGroup.add(leftEye);

        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(-0.04 * scale, 1.62 * scale, 0.15 * scale);
        leftPupil.castShadow = true;
        personGroup.add(leftPupil);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeWhiteMaterial);
        rightEye.position.set(0.04 * scale, 1.62 * scale, 0.13 * scale);
        rightEye.castShadow = true;
        rightEye.receiveShadow = true;
        personGroup.add(rightEye);

        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(0.04 * scale, 1.62 * scale, 0.15 * scale);
        rightPupil.castShadow = true;
        personGroup.add(rightPupil);

        return { leftEye, rightEye, leftPupil, rightPupil };
    }

    createHair(personGroup, hairMaterial, scale) {
        const hairGeometry = new THREE.SphereGeometry(0.16 * scale, 16, 16);
        const hair = new THREE.Mesh(hairGeometry, hairMaterial);
        hair.position.set(0, 1.7 * scale, 0);
        hair.scale.set(1, 0.6, 1);
        hair.castShadow = true;
        personGroup.add(hair);
        return hair;
    }

    createTorso(personGroup, clothingMaterial, scale) {
        const torsoGeometry = new THREE.CylinderGeometry(0.12 * scale, 0.15 * scale, 0.6 * scale, 12);
        const torso = new THREE.Mesh(torsoGeometry, clothingMaterial);
        torso.position.set(0, 1.2 * scale, 0);
        torso.castShadow = true;
        torso.receiveShadow = true;
        personGroup.add(torso);
        return torso;
    }

    createArms(personGroup, clothingMaterial, skinMaterial, scale) {
        const armGeometry = new THREE.CylinderGeometry(0.05 * scale, 0.04 * scale, 0.5 * scale, 8);
        const handGeometry = new THREE.SphereGeometry(0.04 * scale, 8, 8);

        const leftArm = new THREE.Mesh(armGeometry, clothingMaterial);
        leftArm.position.set(-0.16 * scale, 1.2 * scale, 0);
        leftArm.rotation.z = -0.2;
        leftArm.castShadow = true;
        leftArm.receiveShadow = true;
        personGroup.add(leftArm);

        const rightArm = new THREE.Mesh(armGeometry, clothingMaterial);
        rightArm.position.set(0.16 * scale, 1.2 * scale, 0);
        rightArm.rotation.z = 0.2;
        rightArm.castShadow = true;
        rightArm.receiveShadow = true;
        personGroup.add(rightArm);

        const leftHand = new THREE.Mesh(handGeometry, skinMaterial);
        leftHand.position.set(-0.21 * scale, 0.93 * scale, 0);
        leftHand.castShadow = true;
        leftHand.receiveShadow = true;
        personGroup.add(leftHand);

        const rightHand = new THREE.Mesh(handGeometry, skinMaterial);
        rightHand.position.set(0.21 * scale, 0.93 * scale, 0);
        rightHand.castShadow = true;
        rightHand.receiveShadow = true;
        personGroup.add(rightHand);

        return { leftArm, rightArm, leftHand, rightHand };
    }

    createLegs(personGroup, pantsMaterial, scale) {
        const legLength = 0.7 * scale;
        const legGeometry = new THREE.CylinderGeometry(0.06 * scale, 0.07 * scale, legLength, 8);

        const leftLegContainer = new THREE.Group();
        const rightLegContainer = new THREE.Group();

        const hipHeight = 0.9 * scale;
        leftLegContainer.position.set(-0.08 * scale, hipHeight, 0);
        rightLegContainer.position.set(0.08 * scale, hipHeight, 0);

        const leftLeg = new THREE.Mesh(legGeometry, pantsMaterial);
        const rightLeg = new THREE.Mesh(legGeometry, pantsMaterial);

        leftLeg.position.set(0, -legLength / 2, 0);
        rightLeg.position.set(0, -legLength / 2, 0);

        leftLeg.castShadow = true;
        leftLeg.receiveShadow = true;
        rightLeg.castShadow = true;
        rightLeg.receiveShadow = true;

        leftLegContainer.add(leftLeg);
        rightLegContainer.add(rightLeg);

        personGroup.add(leftLegContainer);
        personGroup.add(rightLegContainer);

        return {
            leftLeg: leftLegContainer,
            rightLeg: rightLegContainer,
            leftLegMesh: leftLeg,
            rightLegMesh: rightLeg
        };
    }

    createFeet(legContainers, shoeMaterial, scale) {
        const shoeGeometry = new THREE.BoxGeometry(0.12 * scale, 0.06 * scale, 0.2 * scale);

        const legLength = 0.7 * scale;
        const footOffsetY = -legLength + 0.03 * scale;

        const leftShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        leftShoe.position.set(0, footOffsetY, 0.05 * scale);
        leftShoe.castShadow = true;
        leftShoe.receiveShadow = true;
        legContainers.leftLeg.add(leftShoe);

        const rightShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        rightShoe.position.set(0, footOffsetY, 0.05 * scale);
        rightShoe.castShadow = true;
        rightShoe.receiveShadow = true;
        legContainers.rightLeg.add(rightShoe);

        return { leftShoe, rightShoe };
    }

    createPlayerProp(position, options) {
        return this.createPerson(position, { ...options, name: 'player' });
    }

    getPerson(name) {
        return this.persons[name];
    }

    getAllPersons() {
        return this.persons;
    }

    removePerson(name) {
        const person = this.persons[name];
        if (person) {
            this.scene.remove(person);
            delete this.persons[name];
        }
    }

    updatePersonBoundingBox(name) {
        const person = this.persons[name];
        if (person && person.BBox) {
            person.BBox.setFromObject(person);
        }
    }

    updateAllBoundingBoxes() {
        for (const name in this.persons) {
            this.updatePersonBoundingBox(name);
        }
    }

    /**
     * Laufanimation aktualisieren
     */
    updateWalkingAnimation(person, deltaTime) {
        if (!person.bodyParts || !person.animationState) {
            return;
        }

        const { legs, arms, feet } = person.bodyParts;
        const animState = person.animationState;

        const currentPos = person.position.clone();
        const movement = currentPos.distanceTo(animState.lastPosition);
        const isMoving = movement > 0.01;

        if (isMoving) {
            animState.isWalking = true;
        } else {
            if (animState.walkingStopTimer === undefined) {
                animState.walkingStopTimer = 0;
            }
            animState.walkingStopTimer += deltaTime;

            if (animState.walkingStopTimer > 0.2) {
                animState.isWalking = false;
                animState.walkingStopTimer = 0;
            }
        }

        if (isMoving) {
            animState.walkingStopTimer = 0;
        }

        animState.lastPosition.copy(currentPos);

        if (animState.isWalking) {
            animState.walkCycle += deltaTime * 4;

            const legSwing = Math.sin(animState.walkCycle) * 0.3;
            const targetLeftLegRotation = legSwing;
            const targetRightLegRotation = -legSwing;

            if (legs && legs.leftLeg) {
                legs.leftLeg.rotation.x = THREE.MathUtils.lerp(
                    legs.leftLeg.rotation.x,
                    targetLeftLegRotation,
                    0.15
                );
            }
            if (legs && legs.rightLeg) {
                legs.rightLeg.rotation.x = THREE.MathUtils.lerp(
                    legs.rightLeg.rotation.x,
                    targetRightLegRotation,
                    0.15
                );
            }

            const armSwing = Math.sin(animState.walkCycle) * 0.15;
            const targetLeftArmRotation = -armSwing;
            const targetRightArmRotation = armSwing;

            if (arms && arms.leftArm) {
                arms.leftArm.rotation.x = THREE.MathUtils.lerp(
                    arms.leftArm.rotation.x,
                    targetLeftArmRotation,
                    0.1
                );
            }
            if (arms && arms.rightArm) {
                arms.rightArm.rotation.x = THREE.MathUtils.lerp(
                    arms.rightArm.rotation.x,
                    targetRightArmRotation,
                    0.1
                );
            }
        } else {
            animState.walkCycle = 0;

            // Subtile Atmungsanimation
            const breathingCycle = Date.now() * 0.001;
            const breathingOffset = Math.sin(breathingCycle) * 0.01;

            if (legs && legs.leftLeg) {
                legs.leftLeg.rotation.x = THREE.MathUtils.lerp(legs.leftLeg.rotation.x, 0, 0.1);
            }
            if (legs && legs.rightLeg) {
                legs.rightLeg.rotation.x = THREE.MathUtils.lerp(legs.rightLeg.rotation.x, 0, 0.1);
            }
            if (arms && arms.leftArm) {
                arms.leftArm.rotation.x = THREE.MathUtils.lerp(arms.leftArm.rotation.x, breathingOffset, 0.05);
            }
            if (arms && arms.rightArm) {
                arms.rightArm.rotation.x = THREE.MathUtils.lerp(arms.rightArm.rotation.x, breathingOffset, 0.05);
            }
        }
    }

    /**
     * Sprunganimation aktualisieren
     */
    updateJumpingAnimation(person, targetY) {
        if (!person.animationState) return;

        const animState = person.animationState;
        const currentY = person.position.y;
        const groundLevel = -0.23;

        animState.isJumping = targetY > groundLevel + 0.1;

        if (animState.isJumping) {
            person.position.y = THREE.MathUtils.lerp(currentY, targetY, 0.15);

            if (person.bodyParts.torso) {
                const jumpHeight = Math.max(0, targetY - groundLevel);
                person.bodyParts.torso.rotation.x = jumpHeight * 0.1;
            }
        } else {
            person.position.y = THREE.MathUtils.lerp(currentY, groundLevel, 0.2);

            if (person.bodyParts.torso) {
                person.bodyParts.torso.rotation.x = THREE.MathUtils.lerp(
                    person.bodyParts.torso.rotation.x, 0, 0.1
                );
            }
        }
    }

    animatePersons(deltaTime = 0.016) {
        this.updateAllBoundingBoxes();

        for (const name in this.persons) {
            const person = this.persons[name];
            this.updateWalkingAnimation(person, deltaTime);
        }
    }
}
