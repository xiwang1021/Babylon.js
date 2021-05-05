import { PointerDragBehavior } from "babylonjs/Behaviors/Meshes/pointerDragBehavior";
import { Gizmo } from "babylonjs/Gizmos/gizmo";
import { Matrix, Quaternion, Vector3 } from "babylonjs/Maths/math.vector";
import { AbstractMesh } from "babylonjs/Meshes/abstractMesh";
import { BoxBuilder } from "babylonjs/Meshes/Builders/boxBuilder";
import { TransformNode } from "babylonjs/Meshes/transformNode";
import { PivotTools } from "babylonjs/Misc/pivotTools";
import { Node } from "babylonjs/node";
import { UtilityLayerRenderer } from "babylonjs/Rendering/utilityLayerRenderer";
import { Nullable } from "babylonjs/types";

import { HolographicSlate } from "../controls/holographicSlate";

/**
 * Gizmo to resize 2D slates
 */
export class SlateGizmo extends Gizmo {
    private _boundingDimensions = new Vector3(0, 0, 0);
    private _dragPlaneNormal = new Vector3(0, 0, 1);

    private _tmpQuaternion = new Quaternion();
    private _tmpVector = new Vector3(0, 0, 0);

    // Ordered bl, br, tr, tl
    private _corners: TransformNode[] = [];
    // Ordered left, bottom, right, top
    private _sides: TransformNode[] = [];
    private _handlesParent: TransformNode;

    private _boundingBoxGizmo = {
        min: new Vector3(),
        max: new Vector3(),
    };

    /**
     * Value we use to offset handles from mesh
     */
    private _margin = 1;
    private _attachedSlate: Nullable<HolographicSlate> = null;
    /**
     * If set, the handles will increase in size based on the distance away from the camera to have a consistent screen size (Default: true)
     */
    public fixedScreenSize = false;
    /**
     * The distance away from the object which the draggable meshes should appear world sized when fixedScreenSize is set to true (default: 10)
     */
    public fixedScreenSizeDistanceFactor = 10;

    /**
     * Size of the handles
     */
    public handleSize = 0.1;

    /**
     * The slate attached to this gizmo
     */
    public set attachedSlate(control: Nullable<HolographicSlate>) {
        this._attachedSlate = control;
        if (this._attachedSlate) {
            this.attachedMesh = this._attachedSlate.mesh;
        }
    }

    public get attachedSlate(): Nullable<HolographicSlate> {
        return this._attachedSlate;
    }

    constructor(utilityLayer?: UtilityLayerRenderer) {
        super(utilityLayer);

        this._createNode();
        this.updateScale = false;
    }

    private _createNode() {
        this._handlesParent = new TransformNode("handlesParent", this.gizmoLayer.utilityLayerScene);
        this._handlesParent.rotationQuaternion = Quaternion.Identity();

        const moveFnsCorners = [
            (originStart: Vector3, dimensionsStart: Vector3, offset: Vector3) => this._moveBLCorner(originStart, dimensionsStart, offset),
            (originStart: Vector3, dimensionsStart: Vector3, offset: Vector3) => this._moveBRCorner(originStart, dimensionsStart, offset),
            (originStart: Vector3, dimensionsStart: Vector3, offset: Vector3) => this._moveTRCorner(originStart, dimensionsStart, offset),
            (originStart: Vector3, dimensionsStart: Vector3, offset: Vector3) => this._moveTLCorner(originStart, dimensionsStart, offset),
        ];
        const moveFnsSides = [
            (originStart: Vector3, dimensionsStart: Vector3, offset: Vector3) => this._moveLeftSide(originStart, dimensionsStart, offset),
            (originStart: Vector3, dimensionsStart: Vector3, offset: Vector3) => this._moveBottomSide(originStart, dimensionsStart, offset),
            (originStart: Vector3, dimensionsStart: Vector3, offset: Vector3) => this._moveRightSide(originStart, dimensionsStart, offset),
            (originStart: Vector3, dimensionsStart: Vector3, offset: Vector3) => this._moveTopSide(originStart, dimensionsStart, offset),
        ];

        for (let i = 0; i < 4; i++) {
            const node = this._createAngleMesh();
            this._corners.push(node);
            node.rotation.z = (Math.PI / 2) * i;
            node.scaling.copyFromFloats(this.handleSize, this.handleSize, this.handleSize);
            node.parent = this._handlesParent;
            this._assignDragBehavior(node, moveFnsCorners[i]);
        }

        for (let i = 0; i < 4; i++) {
            const node = this._createSideMesh();
            this._sides.push(node);
            node.rotation.z = (Math.PI / 2) * i;
            node.scaling.copyFromFloats(this.handleSize, this.handleSize, this.handleSize);
            node.parent = this._handlesParent;
            this._assignDragBehavior(node, moveFnsSides[i]);
        }

        this._handlesParent.parent = this._rootMesh;
    }

    private _keepAspectRatio(vector: Vector3, aspectRatio: number, invertDiagonal: boolean = false) {
        const axis = new Vector3(aspectRatio, 1, 0).normalize();
        if (invertDiagonal) {
            axis.y *= -1;
        }
        const dot = Vector3.Dot(vector, axis);
        vector.copyFrom(axis).scaleInPlace(dot);
    }

    // Move functions
    private _moveTLCorner(originStart: Vector3, dimensionsStart: Vector3, offset: Vector3) {
        if (!this._attachedSlate) {
            return;
        }

        const aspectRatio = dimensionsStart.x / dimensionsStart.y;
        this._keepAspectRatio(offset, aspectRatio, true);

        this._attachedSlate.origin.copyFrom(originStart).addInPlace(offset);
        offset.y *= -1;
        this._attachedSlate.dimensions.copyFrom(dimensionsStart).subtractInPlace(offset);
        this._attachedSlate.backplateDimensions.x = this._attachedSlate.dimensions.x;
    }

    private _moveBLCorner(originStart: Vector3, dimensionsStart: Vector3, offset: Vector3) {
        if (!this._attachedSlate) {
            return;
        }

        const aspectRatio = dimensionsStart.x / dimensionsStart.y;
        this._keepAspectRatio(offset, aspectRatio);

        this._attachedSlate.origin.x = originStart.x + offset.x;
        this._attachedSlate.dimensions.copyFrom(dimensionsStart).subtractInPlace(offset);
        this._attachedSlate.backplateDimensions.x = this._attachedSlate.dimensions.x;
    }

    private _moveBRCorner(originStart: Vector3, dimensionsStart: Vector3, offset: Vector3) {
        if (!this._attachedSlate) {
            return;
        }

        const aspectRatio = dimensionsStart.x / dimensionsStart.y;
        this._keepAspectRatio(offset, aspectRatio, true);

        offset.y *= -1;
        this._attachedSlate.dimensions.copyFrom(dimensionsStart).addInPlace(offset);
        this._attachedSlate.backplateDimensions.x = dimensionsStart.x + offset.x;
    }

    private _moveTRCorner(originStart: Vector3, dimensionsStart: Vector3, offset: Vector3) {
        if (!this._attachedSlate) {
            return;
        }

        const aspectRatio = dimensionsStart.x / dimensionsStart.y;
        this._keepAspectRatio(offset, aspectRatio);

        this._attachedSlate.origin.y = originStart.y + offset.y;
        this._attachedSlate.dimensions.copyFrom(dimensionsStart).addInPlace(offset);
        this._attachedSlate.backplateDimensions.x = dimensionsStart.x + offset.x;
    }

    private _moveLeftSide(originStart: Vector3, dimensionsStart: Vector3, offset: Vector3) {
        if (!this._attachedSlate) {
            return;
        }

        this._attachedSlate.origin.x = originStart.x + offset.x;
        this._attachedSlate.dimensions.x = dimensionsStart.x - offset.x;
        this._attachedSlate.backplateDimensions.x = dimensionsStart.x - offset.x;
    }

    private _moveBottomSide(originStart: Vector3, dimensionsStart: Vector3, offset: Vector3) {
        if (!this._attachedSlate) {
            return;
        }

        this._attachedSlate.dimensions.y = dimensionsStart.y - offset.y;
    }

    private _moveRightSide(originStart: Vector3, dimensionsStart: Vector3, offset: Vector3) {
        if (!this._attachedSlate) {
            return;
        }

        this._attachedSlate.dimensions.x = dimensionsStart.x + offset.x;
        this._attachedSlate.backplateDimensions.x = dimensionsStart.x + offset.x;
    }

    private _moveTopSide(originStart: Vector3, dimensionsStart: Vector3, offset: Vector3) {
        if (!this._attachedSlate) {
            return;
        }

        this._attachedSlate.dimensions.y = dimensionsStart.y + offset.y;
        this._attachedSlate.origin.y = originStart.y + offset.y;
    }

    private _assignDragBehavior(node: Node, moveFn: (originStart: Vector3, dimensionsStart: Vector3, offset: Vector3) => void) {
        // Drag behavior
        var _dragBehavior = new PointerDragBehavior({
            dragPlaneNormal: this._dragPlaneNormal,
        });
        _dragBehavior.moveAttached = false;
        _dragBehavior.updateDragPlane = false;
        node.addBehavior(_dragBehavior);

        let dimensionsStart = new Vector3();
        let originStart = new Vector3();
        let dragOrigin = new Vector3();
        let toObjectFrame = new Matrix();

        _dragBehavior.onDragStartObservable.add((event) => {
            if (this.attachedSlate && this.attachedMesh) {
                dimensionsStart.copyFrom(this.attachedSlate.dimensions);
                originStart.copyFrom(this.attachedSlate.origin);
                dragOrigin.copyFrom(event.dragPlanePoint);
                toObjectFrame.copyFrom(this.attachedMesh.computeWorldMatrix(true));
                toObjectFrame.invert();
                this.attachedSlate._followBehavior._enabled = false;
            }
        });

        _dragBehavior.onDragObservable.add((event) => {
            if (this.attachedSlate && this.attachedMesh) {
                this._tmpVector.copyFrom(event.dragPlanePoint);
                this._tmpVector.subtractInPlace(dragOrigin);
                Vector3.TransformNormalToRef(this._tmpVector, toObjectFrame, this._tmpVector);

                moveFn(originStart, dimensionsStart, this._tmpVector);
                this.attachedSlate._positionElements();
                this.updateBoundingBox();
            }
        });

        _dragBehavior.onDragEndObservable.add(() => {
            if (this.attachedSlate && this.attachedNode) {
                this.attachedSlate._updatePivot();
                this.attachedSlate._followBehavior._enabled = true;
            }
        });
    }

    private _createAngleMesh(): TransformNode {
        // Draw 2 boxes making a bottom left corner
        const horizontalBox = BoxBuilder.CreateBox("angleHor", { width: 3, height: 1, depth: 0.1 }, this.gizmoLayer.utilityLayerScene);
        const verticalBox = BoxBuilder.CreateBox("angleVert", { width: 1, height: 3, depth: 0.1 }, this.gizmoLayer.utilityLayerScene);

        const angleNode = new TransformNode("angle", this.gizmoLayer.utilityLayerScene);
        horizontalBox.parent = angleNode;
        verticalBox.parent = angleNode;

        horizontalBox.position.x = 1;
        verticalBox.position.y = 1;

        return angleNode;
    }

    private _createSideMesh(): TransformNode {
        // Draw a simple vertical rectangle
        const verticalBox = BoxBuilder.CreateBox("sideVert", { width: 1, height: 10, depth: 0.1 }, this.gizmoLayer.utilityLayerScene);
        const sideNode = new TransformNode("side", this.gizmoLayer.utilityLayerScene);
        verticalBox.parent = sideNode;

        return sideNode;
    }

    protected _attachedNodeChanged(value: Nullable<AbstractMesh>) {
        if (value) {
            this.updateBoundingBox();
        }
    }

    /**
     * Updates the bounding box information for the Gizmo
     */
    public updateBoundingBox() {
        if (this.attachedMesh) {
            PivotTools._RemoveAndStorePivotPoint(this.attachedMesh);

            // Store original parent
            const originalParent = this.attachedMesh.parent;
            this.attachedMesh.setParent(null);

            this._update();

            // Rotate based on axis
            if (!this.attachedMesh.rotationQuaternion) {
                this.attachedMesh.rotationQuaternion = Quaternion.RotationYawPitchRoll(this.attachedMesh.rotation.y, this.attachedMesh.rotation.x, this.attachedMesh.rotation.z);
            }

            // Store original position and reset mesh to origin before computing the bounding box
            this._tmpQuaternion.copyFrom(this.attachedMesh.rotationQuaternion);
            this._tmpVector.copyFrom(this.attachedMesh.position);
            this.attachedMesh.rotationQuaternion.set(0, 0, 0, 1);
            this.attachedMesh.position.set(0, 0, 0);

            // Update bounding dimensions/positions
            const boundingMinMax = this.attachedMesh.getHierarchyBoundingVectors();
            boundingMinMax.max.subtractToRef(boundingMinMax.min, this._boundingDimensions);
            this._boundingBoxGizmo.min = boundingMinMax.min;
            this._boundingBoxGizmo.max = boundingMinMax.max;

            this._updateHandlesPosition();

            // Restore position/rotation values
            this.attachedMesh.rotationQuaternion.copyFrom(this._tmpQuaternion);
            this.attachedMesh.position.copyFrom(this._tmpVector);

            PivotTools._RestorePivotPoint(this.attachedMesh);

            // Restore original parent
            this.attachedMesh.setParent(originalParent);
        }
    }

    private _updateHandlesPosition() {
        const min = this._boundingBoxGizmo.min.clone();
        const max = this._boundingBoxGizmo.max.clone();

        const handleScaling = this._corners[0].scaling.length();
        min.x -= this._margin * handleScaling;
        min.y -= this._margin * handleScaling;
        max.x += this._margin * handleScaling;
        max.y += this._margin * handleScaling;

        const center = min.add(max).scaleInPlace(0.5);

        this._corners[0].position.copyFromFloats(min.x, min.y, 0);
        this._corners[1].position.copyFromFloats(max.x, min.y, 0);
        this._corners[2].position.copyFromFloats(max.x, max.y, 0);
        this._corners[3].position.copyFromFloats(min.x, max.y, 0);

        this._sides[0].position.copyFromFloats(min.x, center.y, 0);
        this._sides[1].position.copyFromFloats(center.x, min.y, 0);
        this._sides[2].position.copyFromFloats(max.x, center.y, 0);
        this._sides[3].position.copyFromFloats(center.x, max.y, 0);
    }

    protected _update() {
        super._update();

        if (!this.gizmoLayer.utilityLayerScene.activeCamera) {
            return;
        }

        if (this._attachedSlate && this._attachedSlate.mesh) {
            this._attachedSlate.mesh.absolutePosition.subtractToRef(this.gizmoLayer.utilityLayerScene.activeCamera.position, this._tmpVector);
            var distanceFromCamera = (this.handleSize * this._tmpVector.length()) / this.fixedScreenSizeDistanceFactor;
            for (let i = 0; i < this._corners.length; i++) {
                this._corners[i].scaling.set(distanceFromCamera, distanceFromCamera, distanceFromCamera);
            }
            this._updateHandlesPosition();
        }
    }
}
