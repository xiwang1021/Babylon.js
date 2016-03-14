module BABYLON {       
    export class FreeCameraMouseInput implements ICameraInput<FreeCamera> {
        camera : FreeCamera;
        
        @serialize()
        public angularSensibility = 2000.0;
        
        private _onMouseDown: (e: MouseEvent) => any;
        private _onMouseUp: (e: MouseEvent) => any;
        private _onMouseOut: (e: MouseEvent) => any;
        private _onMouseMove: (e: MouseEvent) => any;
        
        attachControl(element: HTMLElement, noPreventDefault?: boolean){     
            var previousPosition;
                
            if (this._onMouseDown === undefined) {
                var camera = this.camera;
                var engine = this.camera.getEngine();
                
                this._onMouseDown = evt => {
                    previousPosition = {
                        x: evt.clientX,
                        y: evt.clientY
                    };

                    if (!noPreventDefault) {
                        evt.preventDefault();
                    }
                };

                this._onMouseUp = evt => {
                    previousPosition = null;
                    if (!noPreventDefault) {
                        evt.preventDefault();
                    }
                };

                this._onMouseOut = evt => {
                    previousPosition = null;
                    
                    if (!noPreventDefault) {
                        evt.preventDefault();
                    }
                };

                this._onMouseMove = evt => {
                    if (!previousPosition && !engine.isPointerLock) {
                        return;
                    }

                    var offsetX;
                    var offsetY;

                    if (!engine.isPointerLock) {
                        offsetX = evt.clientX - previousPosition.x;
                        offsetY = evt.clientY - previousPosition.y;
                    } else {
                        offsetX = evt.movementX || evt.mozMovementX || evt.webkitMovementX || evt.msMovementX || 0;
                        offsetY = evt.movementY || evt.mozMovementY || evt.webkitMovementY || evt.msMovementY || 0;
                    }

                    camera.cameraRotation.y += offsetX / this.angularSensibility;
                    camera.cameraRotation.x += offsetY / this.angularSensibility;

                    previousPosition = {
                        x: evt.clientX,
                        y: evt.clientY
                    };
                    
                    if (!noPreventDefault) {
                        evt.preventDefault();
                    }
                };
            }

            element.addEventListener("mousedown", this._onMouseDown, false);
            element.addEventListener("mouseup", this._onMouseUp, false);
            element.addEventListener("mouseout", this._onMouseOut, false);
            element.addEventListener("mousemove", this._onMouseMove, false);
   
        }
        
        detachControl(element : HTMLElement){   
            if (this._onMouseDown && element){
                element.removeEventListener("mousedown", this._onMouseDown);
                element.removeEventListener("mouseup", this._onMouseUp);
                element.removeEventListener("mouseout", this._onMouseOut);
                element.removeEventListener("mousemove", this._onMouseMove);
                
                this._onMouseDown = null;
                this._onMouseUp = null;
                this._onMouseOut = null;
                this._onMouseMove = null;
            }        
        }
        
        getTypeName(): string{
            return "FreeCameraMouseInput";
        }
        
        getSimpleName(){
            return "mouse";
        }
    }
    
    CameraInputTypes["FreeCameraMouseInput"] = FreeCameraMouseInput;
}